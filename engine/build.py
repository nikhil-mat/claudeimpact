"""Follow the Rupee: build pipeline.

Reads the synthetic Mumbai monsoon-roads dataset and produces:
  out/audit_flags.csv          one row per flag, with evidence
  out/contractor_scorecard.csv fair, context-adjusted contractor metrics
  out/ward_summary.csv         money trail per ward
  out/next_rupee_plan.csv      ranked fix list per ward
  out/complaints_clean.csv     classified + geocoded complaints, linked to work orders
  out/issues.csv               de-duplicated open issues
  out/linker_eval.json         accuracy of classifier/geocoder vs BMC-linked work orders
  app/data.js                  everything above, bundled for the dashboard

Run:  python engine/build.py --data <Claude-Impact-Labs-data-2/data>   (writes engine/out/)

This is the team's single audit engine: scripts/build_data.py (Corporator view) and
scripts/ward-officer/build-facts.mjs (Ward Desk) read engine/out/audit_flags.csv instead of
computing their own flags, so every screen shows the same numbers.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- thresholds
RATE_TOLERANCE = 1.35        # rate card says normal jobs vary 20-30%; flag above +35%
DUP_WINDOW_DAYS = 7          # same road + method + contractor + area, re-billed within a week
SURFACE_WORK = {"Pothole", "Broken paver blocks", "Road cave-in"}   # what a road DLP covers
SEVERITY_WEIGHT = {          # danger to people if left unfixed
    "Road cave-in": 5, "Open or broken manhole": 5, "Waterlogging": 4,
    "Pothole": 3, "Choked drain / nullah overflow": 3, "Broken paver blocks": 2,
}
CATEGORIES = list(SEVERITY_WEIGHT)


# ---------------------------------------------------------------- helpers
def km(lat1, lon1, lat2, lon2):
    """Equirectangular distance in km (fine at city scale). Vectorised."""
    x = np.radians(np.asarray(lon2) - lon1) * math.cos(math.radians(19.07))
    y = np.radians(np.asarray(lat2) - lat1)
    return 6371.0 * np.sqrt(x * x + y * y)


def point_seg_km(lat, lon, s_lat, s_lon, e_lat, e_lon):
    """Distance from a point to each road segment (arrays), in km."""
    k = math.cos(math.radians(19.07))
    px, py = lon * k, lat
    ax, ay, bx, by = s_lon * k, s_lat, e_lon * k, e_lat
    dx, dy = bx - ax, by - ay
    t = ((px - ax) * dx + (py - ay) * dy) / np.maximum(dx * dx + dy * dy, 1e-12)
    t = np.clip(t, 0, 1)
    cx, cy = ax + t * dx, ay + t * dy
    return np.sqrt((px - cx) ** 2 + (py - cy) ** 2) * 111.2


def pct_rank(s: pd.Series) -> pd.Series:
    """0..1 percentile; all-zero columns stay zero."""
    if s.max() == s.min():
        return s * 0.0
    return s.rank(pct=True, method="average").where(s > 0, 0.0)


def inr(x: float) -> str:
    x = float(x)
    if abs(x) >= 1e7:
        return f"₹{x/1e7:.2f} cr"
    if abs(x) >= 1e5:
        return f"₹{x/1e5:.1f} lakh"
    return f"₹{x:,.0f}"


# ---------------------------------------------------------------- load
def load(data: Path) -> dict[str, pd.DataFrame]:
    names = ["work_orders", "rate_card", "roads", "wards", "contractors", "complaints",
             "localities", "flood_hotspots", "rainfall_daily", "tides", "traffic",
             "accidents", "facilities", "social_posts"]
    d = {n: pd.read_csv(data / f"{n}.csv") for n in names}
    wo = d["work_orders"]
    for c in ["assigned_at", "work_started_at", "completed_at"]:
        wo[c] = pd.to_datetime(wo[c])
    d["complaints"]["received_at"] = pd.to_datetime(d["complaints"]["received_at"])
    d["complaints"]["resolved_at"] = pd.to_datetime(d["complaints"]["resolved_at"])
    d["roads"]["last_resurfaced"] = pd.to_datetime(d["roads"]["last_resurfaced"])
    d["rainfall_daily"]["date"] = pd.to_datetime(d["rainfall_daily"]["date"])
    d["tides"]["date"] = pd.to_datetime(d["tides"]["date"])
    return d


# ================================================================ 1. CONNECT
NOISE_PATTERNS = [r"^test$", r"^asdf", r"garbage not collected", r"hawkers", r"tree branch",
                  r"mosquito", r"street ?light", r"stray dog", r"noise", r"water supply"]

# keyword -> category; the earliest match in the text wins (helpline notes state the issue first)
KEYWORDS = {
    "Open or broken manhole": ["manhole", "gutter ka dhakkan", "dhakkan", "मैनहोल", "ढक्कन", "झाकण"],
    "Road cave-in": ["cave-in", "cave in", "caved", "has sunk", "sinkhole", "collapsed", "dhas gaya",
                     "dhans", "धंस", "धस", "खचला", "खचल"],
    "Broken paver blocks": ["paver", "पेव्हर", "पेवर", "ब्लॉक"],
    "Choked drain / nullah overflow": ["choked drain", "nullah", "nala", "gutter choked", "drain",
                                       "culvert", "नाला", "नाले", "गटार तुंब", "गटर"],
    "Pothole": ["pothole", "pot hole", "pot-hole", "khadda", "gadda", "gaddha", "crater", "गड्ढ", "खड्ड"],
    "Waterlogging": ["waterlog", "water logged", "flooded", "flood", "paani bhar", "itna paani",
                     "water not receding", "knee deep", "knee-deep", "पानी भर", "पाणी साच", "पाणी भर"],
}
PHOTO_MAP = {
    "crater": "Pothole", "potholes": "Pothole", "brown water": "Waterlogging",
    "knee-deep": "Waterlogging", "manhole": "Open or broken manhole",
    "nullah": "Choked drain / nullah overflow", "storm drain": "Choked drain / nullah overflow",
    "collapsed road": "Road cave-in", "sinkhole": "Road cave-in", "paver": "Broken paver blocks",
}


def _text_category(t: str) -> str | None:
    """Explicit issue nouns first (earliest wins); generic 'water' words only as a fallback."""
    best, pos = None, 10 ** 9
    for cat, kws in KEYWORDS.items():
        if cat == "Waterlogging":
            continue
        for kw in kws:
            i = t.find(kw)
            if i != -1 and i < pos:
                best, pos = cat, i
    w = min((t.find(k) for k in KEYWORDS["Waterlogging"] if k in t), default=-1)
    if w != -1 and (best is None or (w < pos and t[w:w + 8].startswith("waterlog"))):
        return "Waterlogging"
    return best


def classify(desc: str, photo: str, reported: str, language: str, channel: str) -> tuple[str, str]:
    """Return (category, signal used).

    Signal order was chosen by measuring each signal against the 4,948 complaints BMC linked to a
    work order (see linker_eval.json): photo 100%, English / helpline text 99%, citizen-picked
    category 83%, free text typed in Hindi / Marathi / Hinglish in the app ~30%.
    """
    t = str(desc or "").strip().lower()
    if len(t) < 4 or any(re.search(p, t) for p in NOISE_PATTERNS):
        return "Not a road issue", "noise filter"
    p = str(photo or "").lower()
    for kw, cat in PHOTO_MAP.items():
        if kw in p:
            return cat, "photo"
    txt = _text_category(t)
    if txt and (language == "en" or channel == "1916 Helpline"):
        return txt, "text"
    if reported in CATEGORIES:
        return reported, "reported category"
    if txt:
        return txt, "text (low confidence)"
    return "Unclear", "none"


class Geocoder:
    def __init__(self, d):
        self.roads = d["roads"].copy()
        self.wards = d["wards"]
        loc = d["localities"]
        self.loc_index: dict[str, tuple] = {}
        for _, r in loc.iterrows():
            names = [r.locality] + [a.strip() for a in str(r.aliases).split(";") if a.strip() and a != "nan"]
            for n in names:
                self.loc_index[n.lower()] = (r.locality, r.ward_code, r.lat, r.lon)
        self.loc_keys = sorted(self.loc_index, key=len, reverse=True)
        # road names + common aliases
        self.road_names: dict[str, str] = {}
        for n in self.roads.road_name.unique():
            self.road_names[n.lower()] = n
            self.road_names[n.lower().replace("'", "")] = n
        alias = {"jogeshwari vikhroli link road": "JVLR", "s v road": "SV Road", "l b s marg": "LBS Marg",
                 "lbs road": "LBS Marg", "w e highway": "Western Express Highway", "weh": "Western Express Highway",
                 "e e highway": "Eastern Express Highway", "eeh": "Eastern Express Highway",
                 "kurla andheri road": "Kurla Andheri Road"}
        for a, n in alias.items():
            if n in set(self.roads.road_name):
                self.road_names[a] = n
        self.road_keys = sorted(self.road_names, key=len, reverse=True)

    def locality(self, text: str, desc: str):
        t = str(text or "").strip().lower()
        if t and t != "nan":
            if t in self.loc_index:
                return self.loc_index[t]
            for k in self.loc_keys:                       # shortened: "Saki" -> "Saki Naka"
                if k.startswith(t) and len(t) >= 4:
                    return self.loc_index[k]
            for k in self.loc_keys:
                if k in t:
                    return self.loc_index[k]
        dl = str(desc or "").lower()
        for k in self.loc_keys:
            if len(k) >= 4 and k in dl:
                return self.loc_index[k]
        return None

    def ward_from_point(self, lat, lon):
        d = km(lat, lon, self.wards.centroid_lat.values, self.wards.centroid_lon.values)
        return self.wards.ward_code.values[int(np.argmin(d))]    # wards.geojson is a Voronoi on centroids

    def road(self, desc, ward, lat, lon):
        dl = " " + re.sub(r"\s+", " ", str(desc or "").lower().replace("'", "")) + " "
        name = None
        for k in self.road_keys:
            if k in dl:
                name = self.road_names[k]
                break
        cand = self.roads
        if name:
            c2 = cand[cand.road_name == name]
            if ward and (c2.ward_code == ward).any():
                c2 = c2[c2.ward_code == ward]
            cand = c2
            how = "road name in text"
        else:
            if ward:
                cand = cand[cand.ward_code == ward]
            how = "nearest road"
        if cand.empty:
            return None, "none", None
        if lat is None or pd.isna(lat):
            if len(cand) == 1 or name:
                return cand.iloc[0].road_id, how + " (no coordinates)", None
            return None, "no road match", None
        dist = point_seg_km(lat, lon, cand.start_lat.values, cand.start_lon.values,
                            cand.end_lat.values, cand.end_lon.values)
        i = int(np.argmin(dist))
        return cand.iloc[i].road_id, how, float(dist[i])


def connect(d) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    c = d["complaints"].copy()
    wo = d["work_orders"]
    geo = Geocoder(d)

    link = {cid: r.work_order_id for _, r in wo.iterrows() if isinstance(r.linked_complaint_ids, str)
            for cid in r.linked_complaint_ids.split("|")}

    rows = []
    for r in c.itertuples(index=False):
        cat, how = classify(r.description, r.photo_description, r.category_reported, r.language, r.channel)
        loc = geo.locality(r.locality_text, r.description)
        ward = r.ward_code if isinstance(r.ward_code, str) else None
        ward_src = "given" if ward else None
        lat, lon, pt_src = r.lat, r.lon, "GPS"
        if pd.isna(lat) and loc:
            lat, lon, pt_src = loc[2], loc[3], "locality"
        if pd.isna(lat):
            pt_src = None
        if not ward and loc:
            ward, ward_src = loc[1], "locality"
        if not ward and pt_src:
            ward, ward_src = geo.ward_from_point(lat, lon), "GPS point"
        road_id, road_how, dist = (None, "none", None)
        if cat not in ("Not a road issue",):
            road_id, road_how, dist = geo.road(r.description, ward, lat, lon)
        rows.append(dict(
            complaint_id=r.complaint_id, clean_category=cat, category_source=how,
            category_changed=(cat != r.category_reported), locality=loc[0] if loc else None,
            ward=ward, ward_source=ward_src, point_source=pt_src, road_id=road_id,
            road_match=road_how, road_dist_km=dist, work_order_id=link.get(r.complaint_id)))
    cc = c.merge(pd.DataFrame(rows), on="complaint_id")

    # ---- evaluate against BMC's own links (complaints that BMC tied to a work order)
    w = wo.set_index("work_order_id")
    rn = d["roads"].set_index("road_id").road_name
    ev = cc[cc.work_order_id.notna()].copy()
    ev["wo_road"] = ev.work_order_id.map(w.road_id)
    ev["wo_ward"] = ev.work_order_id.map(w.ward_code)
    ev["wo_type"] = ev.work_order_id.map(w.work_type)
    evaluation = {
        "complaints_with_work_order": int(len(ev)),
        "category_accuracy_cleaned": round(float((ev.clean_category == ev.wo_type).mean()), 3),
        "category_accuracy_as_reported": round(float((ev.category_reported == ev.wo_type).mean()), 3),
        "ward_accuracy": round(float((ev.ward == ev.wo_ward).mean()), 3),
        "road_name_accuracy": round(float((ev.road_id.map(rn) == ev.wo_road.map(rn)).mean()), 3),
        "segment_accuracy": round(float((ev.road_id == ev.wo_road).mean()), 3),
        "segment_accuracy_with_gps": round(float((ev[ev.point_source == "GPS"].road_id
                                                  == ev[ev.point_source == "GPS"].wo_road).mean()), 3),
        "ward_missing_filled": int(c.ward_code.isna().sum()),
    }
    # where our road guess disagrees, trust BMC's link for linked complaints
    cc["road_id_final"] = np.where(cc.work_order_id.notna(), cc.work_order_id.map(w.road_id), cc.road_id)
    cc["ward_final"] = np.where(cc.work_order_id.notna(), cc.work_order_id.map(w.ward_code), cc.ward)

    # ---- open issues: complaints with no work order that are still Open / In Progress
    op = cc[cc.status.isin(["Open", "In Progress"]) & cc.work_order_id.isna()
            & cc.clean_category.isin(CATEGORIES) & cc.road_id_final.notna()].copy()
    # one issue = same ward + same road + same problem; GPS complaints decide the exact segment
    op["road_name"] = op.road_id_final.map(rn)
    op["seg_vote"] = np.where(op.point_source == "GPS", 3, 1)
    seg = (op.groupby(["ward_final", "road_name", "clean_category", "road_id_final"]).seg_vote.sum()
             .reset_index().sort_values("seg_vote", ascending=False)
             .drop_duplicates(["ward_final", "road_name", "clean_category"]))
    issues = (op.sort_values("received_at")
                .groupby(["ward_final", "road_name", "clean_category"])
                .agg(ward=("ward_final", "first"), complaints=("complaint_id", "size"),
                     complaint_ids=("complaint_id", lambda s: "|".join(s)),
                     first_reported=("received_at", "min"), last_reported=("received_at", "max"),
                     upvotes=("upvotes", "sum"), channels=("channel", "nunique"),
                     languages=("language", lambda s: ",".join(sorted(set(s)))))
                .reset_index()
                .merge(seg[["ward_final", "road_name", "clean_category", "road_id_final"]],
                       on=["ward_final", "road_name", "clean_category"])
                .drop(columns=["ward_final", "road_name"])
                .rename(columns={"road_id_final": "road_id", "clean_category": "category"}))
    issues.insert(0, "issue_id", [f"ISS-{i+1:04d}" for i in range(len(issues))])
    evaluation["open_complaints"] = int(len(op))
    evaluation["open_issues_after_dedup"] = int(len(issues))
    evaluation["noise_dropped"] = int((cc.clean_category == "Not a road issue").sum())
    evaluation["category_corrected"] = int((cc.category_changed & cc.clean_category.isin(CATEGORIES)).sum())
    evaluation["resolved_without_work_order"] = int(((cc.status == "Resolved") & cc.work_order_id.isna()).sum())
    return cc, issues, evaluation


# ================================================================ 2. AUDIT
def audit(d) -> tuple[pd.DataFrame, pd.DataFrame]:
    wo = d["work_orders"].merge(d["rate_card"], on="repair_method", how="left")
    wo["expected_inr"] = np.where(wo.unit == "per sqm", wo.area_sqm * wo.standard_rate_inr, wo.standard_rate_inr)
    wo["cost_ratio"] = wo.cost_inr / wo.expected_inr
    wo = wo.merge(d["roads"][["road_id", "road_name", "under_dlp", "last_resurfaced", "surface"]], on="road_id")
    first_c = d["complaints"].set_index("complaint_id").received_at
    wo["first_complaint_at"] = wo.linked_complaint_ids.map(
        lambda s: min(first_c[i] for i in s.split("|")) if isinstance(s, str) else pd.NaT)
    wo["hours_to_fix"] = (wo.completed_at - wo.first_complaint_at.fillna(wo.assigned_at)).dt.total_seconds() / 3600
    wo["reopened"] = wo.reopened_within_30d.eq("Y")
    wo["sla_ok"] = wo.sla_met.eq("Y")

    flags = []

    def add(r, kind, level, amount, reason, evidence):
        flags.append(dict(work_order_id=r.work_order_id, flag=kind, confidence=level, ward_code=r.ward_code,
                          contractor_id=r.contractor_id, contractor_name=r.contractor_name, road_id=r.road_id,
                          road_name=r.road_name, repair_method=r.repair_method, completed_at=r.completed_at,
                          cost_inr=int(r.cost_inr), amount_at_issue_inr=int(round(amount)), reason=reason,
                          evidence=evidence))

    # (a) over-billing vs rate card
    for r in wo[wo.cost_ratio > RATE_TOLERANCE].itertuples():
        unit = f"{r.area_sqm} sqm × ₹{r.standard_rate_inr:,}" if r.unit == "per sqm" else f"₹{r.standard_rate_inr:,} per job"
        add(r, "Over-billed vs rate card", "High" if r.cost_ratio > 1.5 else "Medium", r.cost_inr - r.expected_inr,
            f"Billed {inr(r.cost_inr)} vs standard {inr(r.expected_inr)} ({unit}): {r.cost_ratio-1:+.0%}. "
            f"Normal jobs stay within ±30%.",
            f"rate_card: {r.repair_method} = ₹{r.standard_rate_inr:,} {r.unit}")

    # (b) double billing: no complaint linked, near-identical twin on same road shortly before/after
    wo_sorted = wo.sort_values("assigned_at")
    for r in wo[wo.linked_complaint_ids.isna()].itertuples():
        m = wo_sorted[(wo_sorted.road_id == r.road_id) & (wo_sorted.repair_method == r.repair_method)
                      & (wo_sorted.work_order_id != r.work_order_id)]
        gap = (m.assigned_at - r.assigned_at).abs().dt.total_seconds() / 86400
        m = m.assign(gap=gap, exact=(m.area_sqm == r.area_sqm) & (m.contractor_id == r.contractor_id))
        m = m[m.gap <= DUP_WINDOW_DAYS].sort_values(["exact", "gap"], ascending=[False, True])
        if m.empty:
            add(r, "No complaint linked", "Low", 0, "Work order has no complaint behind it and no twin job; "
                "ask the ward engineer what triggered it.", "linked_complaint_ids is blank")
            continue
        t = m.iloc[0]
        same = (t.area_sqm == r.area_sqm) and (t.contractor_id == r.contractor_id)
        add(r, "Possible double billing", "High" if same else "Medium", r.cost_inr,
            f"Same road, same method{', same contractor and same area (' + str(r.area_sqm) + ' sqm)' if same else ''} "
            f"as {t.work_order_id}, {t.gap:.0f} day(s) apart, and no complaint linked to this one.",
            f"twin {t.work_order_id} billed {inr(t.cost_inr)} on {t.assigned_at:%d %b}")

    # (c) BMC paid for work on a road still under Defect Liability Period
    for r in wo[(wo.under_dlp == "Y") & (wo.cost_inr > 0)].itertuples():
        surface = r.work_type in SURFACE_WORK
        add(r, "Paid during DLP", "High" if surface else "Review", r.cost_inr,
            (f"{r.road_name} was resurfaced on {r.last_resurfaced:%d %b %Y} and is still under DLP. "
             + ("The original contractor should have fixed this road defect at no cost to BMC."
                if surface else "Drainage/pumping work may fall outside the road DLP; check the contract.")),
            f"roads.csv under_dlp=Y, last_resurfaced {r.last_resurfaced:%Y-%m-%d}")

    # (d) SLA flag inconsistent with timestamps (reported met but actually late, or vice versa)
    linked = wo.linked_complaint_ids.notna()
    late = wo.hours_to_fix > wo.sla_hours + 1
    early = wo.hours_to_fix < wo.sla_hours - 1
    for r in wo[linked & ((wo.sla_ok & late) | (~wo.sla_ok & early))].itertuples():
        add(r, "SLA record mismatch", "Low", 0,
            f"Recorded sla_met={r.sla_met} but took {r.hours_to_fix:.0f} h against a {r.sla_hours} h target.",
            "first complaint received_at → completed_at")

    return wo, pd.DataFrame(flags)


# ================================================================ 3. HOLD TO ACCOUNT
def context(d, wo) -> pd.DataFrame:
    """Expected SLA / re-open rates given things a contractor cannot control."""
    wards = d["wards"][["ward_code", "low_lying_index"]]
    rain = d["rainfall_daily"].groupby("date").rainfall_mm.max()
    w = wo.merge(wards, on="ward_code")
    w["rain_mm_at_assignment"] = w.assigned_at.dt.normalize().map(rain).fillna(0)
    w["ll_band"] = pd.cut(w.low_lying_index, [0, 0.5, 0.7, 1.0], labels=["low", "mid", "high"])
    w["rain_band"] = pd.cut(w.rain_mm_at_assignment, [-1, 64.4, 204.4, 9999], labels=["normal", "heavy", "extreme"])
    # indirect standardisation: city average in the same (flood-prone band x severity x rain) cell
    w["exp_sla"] = w.groupby(["ll_band", "sla_hours", "rain_band"], observed=True).sla_ok.transform("mean")
    w["exp_reopen"] = w.groupby(["repair_method", "ll_band"], observed=True).reopened.transform("mean")
    w["exp_ratio"] = 1.0
    return w


def scorecards(d, w, flags) -> pd.DataFrame:
    g = w.groupby(["contractor_id", "contractor_name"])
    sc = g.agg(jobs=("work_order_id", "size"), billed_inr=("cost_inr", "sum"), wards=("ward_code", "nunique"),
               sla_met=("sla_ok", "mean"), sla_expected=("exp_sla", "mean"),
               median_hours=("hours_to_fix", "median"),
               reopen=("reopened", "mean"), reopen_expected=("exp_reopen", "mean"),
               median_cost_ratio=("cost_ratio", "median"),
               low_lying_share=("low_lying_index", lambda s: (s >= 0.7).mean()),
               failed_spend_inr=("cost_inr", lambda s: s[w.loc[s.index, "reopened"]].sum())).reset_index()
    sc["sla_vs_expected_pts"] = (sc.sla_met - sc.sla_expected) * 100
    sc["reopen_vs_expected_pts"] = (sc.reopen - sc.reopen_expected) * 100
    f = flags[flags.flag.isin(["Over-billed vs rate card", "Possible double billing"])]
    fs = f.groupby(["contractor_id", "flag"]).agg(n=("work_order_id", "size"), amt=("amount_at_issue_inr", "sum")).unstack(fill_value=0)
    sc["overbilled_jobs"] = sc.contractor_id.map(fs[("n", "Over-billed vs rate card")]).fillna(0).astype(int)
    sc["overbilled_excess_inr"] = sc.contractor_id.map(fs[("amt", "Over-billed vs rate card")]).fillna(0).astype(int)
    sc["double_billed_jobs"] = sc.contractor_id.map(fs[("n", "Possible double billing")]).fillna(0).astype(int)
    sc["double_billed_inr"] = sc.contractor_id.map(fs[("amt", "Possible double billing")]).fillna(0).astype(int)
    dl = flags[(flags.flag == "Paid during DLP") & (flags.confidence == "High")].groupby("contractor_id").amount_at_issue_inr.agg(["size", "sum"])
    sc["dlp_surface_jobs"] = sc.contractor_id.map(dl["size"]).fillna(0).astype(int)
    sc["overbilled_rate"] = sc.overbilled_jobs / sc.jobs

    # grades on adjusted metrics (A best). Each dimension scored 0-100, relative to fair expectation.
    def grade(x):
        return "A" if x >= 80 else "B" if x >= 65 else "C" if x >= 50 else "D"
    sc["speed_score"] = (60 + 2.0 * sc.sla_vs_expected_pts).clip(0, 100)
    sc["durability_score"] = (60 - 2.0 * sc.reopen_vs_expected_pts).clip(0, 100)
    sc["cost_score"] = (100 - 800 * sc.overbilled_rate - 100 * (sc.median_cost_ratio - 1.05).clip(lower=0)).clip(0, 100)
    sc["double_billed_rate"] = sc.double_billed_jobs / sc.jobs
    sc["integrity_score"] = (100 - 1500 * sc.double_billed_rate).clip(0, 100)
    for k in ["speed", "durability", "cost", "integrity"]:
        sc[f"{k}_grade"] = sc[f"{k}_score"].map(grade)
    sc["overall_score"] = (0.25 * sc.speed_score + 0.35 * sc.durability_score + 0.25 * sc.cost_score
                           + 0.15 * sc.integrity_score).round(1)
    sc["overall_grade"] = sc.overall_score.map(grade)
    return sc.sort_values("overall_score", ascending=False)


def ward_summary(d, w, flags) -> pd.DataFrame:
    wards = d["wards"]
    g = w.groupby("ward_code")
    ws = g.agg(jobs=("work_order_id", "size"), spend_inr=("cost_inr", "sum"),
               failed_spend_inr=("cost_inr", lambda s: s[w.loc[s.index, "reopened"]].sum()),
               sla_met=("sla_ok", "mean"), sla_expected=("exp_sla", "mean"),
               reopen=("reopened", "mean")).reset_index()
    ws = wards[["ward_code", "ward_name", "zone", "low_lying_index", "population_est", "engineering_crews",
                "monsoon_repair_budget_inr_2025"]].merge(ws, on="ward_code", how="left").rename(
        columns={"monsoon_repair_budget_inr_2025": "budget_inr"})
    ws["remaining_inr"] = ws.budget_inr - ws.spend_inr
    ws["utilisation"] = ws.spend_inr / ws.budget_inr
    money = flags[flags.flag.isin(["Over-billed vs rate card", "Possible double billing"])
                  | ((flags.flag == "Paid during DLP") & (flags.confidence == "High"))]
    rec = money.groupby("ward_code").amount_at_issue_inr.sum()
    ws["recoverable_inr"] = ws.ward_code.map(rec).fillna(0).astype(int)
    by_c = w.groupby(["ward_code", "contractor_name"]).cost_inr.sum().reset_index()
    by_m = w.groupby(["ward_code", "repair_method"]).cost_inr.sum().reset_index()
    ws["by_contractor"] = ws.ward_code.map(lambda k: by_c[by_c.ward_code == k].sort_values("cost_inr", ascending=False)
                                           .set_index("contractor_name").cost_inr.astype(int).to_dict())
    ws["by_method"] = ws.ward_code.map(lambda k: by_m[by_m.ward_code == k].sort_values("cost_inr", ascending=False)
                                       .set_index("repair_method").cost_inr.astype(int).to_dict())
    return ws


# ================================================================ 4. BUDGET SMARTER
def method_guide(w, rate_card) -> pd.DataFrame:
    """Per work type: cost of a fix that lasts = typical cost / (1 - re-open rate)."""
    g = w.groupby(["work_type", "repair_method"]).agg(jobs=("work_order_id", "size"), reopen=("reopened", "mean"),
                                                      median_area=("area_sqm", "median"),
                                                      median_cost=("cost_inr", "median")).reset_index()
    g = g.merge(rate_card, on="repair_method")
    g["std_cost_inr"] = np.where(g.unit == "per sqm", g.median_area * g.standard_rate_inr, g.standard_rate_inr)
    g["cost_per_lasting_fix"] = g.std_cost_inr / (1 - g.reopen)
    # prefer durability: pick lowest re-open unless it costs >2x the next-best lasting cost
    best = []
    for wt, grp in g.groupby("work_type"):
        grp = grp.sort_values("reopen")
        pick = grp.iloc[0]
        if pick.cost_per_lasting_fix > 2 * grp.cost_per_lasting_fix.min():
            pick = grp.sort_values("cost_per_lasting_fix").iloc[0]
        best.append(pick.repair_method)
    g["recommended"] = g.repair_method.isin(best)
    return g


def plan(d, w, issues, mg, ws) -> tuple[pd.DataFrame, pd.DataFrame]:
    roads = d["roads"].merge(d["traffic"], on="road_id", how="left")
    roads["mid_lat"] = (roads.start_lat + roads.end_lat) / 2
    roads["mid_lon"] = (roads.start_lon + roads.end_lon) / 2

    # flood exposure: hotspots within 600 m, weighted by how often rain beat their threshold and big tides
    fh = d["flood_hotspots"]
    rain = d["rainfall_daily"].pivot(index="date", columns="station", values="rainfall_mm")
    big_tide_days = set(d["tides"][d["tides"].big_tide_flag == "Y"].date)
    fh = fh.copy()
    fh["station"] = np.where(fh.lat < 18.99, "Colaba", "Santacruz")
    fh["flood_days"] = [int((rain[s] >= t).sum()) for s, t in zip(fh.station, fh.flood_threshold_mm_per_day)]
    fh["flood_tide_days"] = [int(((rain[s] >= t) & rain.index.isin(big_tide_days)).sum()) if tide == "Y" else 0
                             for s, t, tide in zip(fh.station, fh.flood_threshold_mm_per_day, fh.tide_sensitive)]
    fh["exposure"] = (fh.flood_days + 2 * fh.flood_tide_days) * (1 + fh.years_flagged_last_5 / 5) * \
                     (1 + fh.avg_water_depth_cm / 50) * np.where(fh.pumping_station_nearby == "Y", 0.8, 1.0)
    flood, near_fh = [], []
    for r in roads.itertuples():
        dist = point_seg_km(fh.lat.values, fh.lon.values, r.start_lat, r.start_lon, r.end_lat, r.end_lon)
        m = dist <= 0.6
        flood.append(float(fh.exposure.values[m].sum()))
        near_fh.append("; ".join(fh.name.values[m]))
    roads["flood_exposure"] = flood
    roads["flood_hotspots"] = near_fh

    acc = d["accidents"]
    road_cause = acc.probable_cause.str.contains("Pothole|Waterlogged|Uneven|chamber", case=False)
    sev_w = acc.severity.map({"Minor": 1, "Grievous": 3, "Fatal": 8})
    roads["road_condition_accidents"] = roads.road_id.map(acc[road_cause].groupby("road_id").size()).fillna(0)
    roads["accident_harm"] = roads.road_id.map((sev_w * np.where(road_cause, 1.0, 0.25)).groupby(acc.road_id).sum()).fillna(0)

    fac = d["facilities"]
    fw = np.where(fac.type == "Hospital", np.where(fac.emergency_services == "Y", 3.0, 1.5), 1.0) * \
         np.log1p(fac.beds_or_students) / np.log1p(500)
    roads["facility_weight"] = roads.road_id.map(pd.Series(fw).groupby(fac.ambulance_entry_road.values).sum()).fillna(0)
    roads["facilities"] = roads.road_id.map(fac.groupby("ambulance_entry_road").name.apply(lambda s: "; ".join(s))).fillna("")

    roads["traffic_load"] = (roads.peak_hour_vehicles.fillna(0) / 1000 * (1 + roads.congestion_index_0_10.fillna(0) / 10)
                             * (1 + roads.two_wheeler_share_pct.fillna(0) / 100) + roads.bus_routes_count.fillna(0) / 5)
    roads["failed_fixes"] = roads.road_id.map(w[w.reopened].groupby("road_id").size()).fillna(0)

    # issue-level risk
    it = issues.merge(roads[["road_id", "road_name", "ward_code", "road_type", "under_dlp", "bus_route",
                             "flood_exposure", "flood_hotspots", "road_condition_accidents", "accident_harm",
                             "facility_weight", "facilities", "traffic_load", "failed_fixes"]], on="road_id")
    it["severity"] = it.category.map(SEVERITY_WEIGHT)
    days_open = (pd.Timestamp("2025-10-05") - it.first_reported).dt.days
    it["demand"] = it.complaints + np.log1p(it.upvotes) + 0.5 * it.channels
    it["days_open"] = days_open
    is_water = it.category.isin(["Waterlogging", "Choked drain / nullah overflow"])
    comp = pd.DataFrame({
        "severity": it.severity / 5,
        "demand": pct_rank(it.demand),
        "flood": pct_rank(it.flood_exposure) * np.where(is_water | (it.category == "Pothole"), 1.0, 0.6),
        "traffic": pct_rank(it.traffic_load),
        "accidents": pct_rank(it.accident_harm),
        "facilities": pct_rank(it.facility_weight),
        "history": pct_rank(it.failed_fixes),
    })
    weights = {"severity": 0.25, "demand": 0.10, "flood": 0.15, "traffic": 0.12, "accidents": 0.15,
               "facilities": 0.13, "history": 0.10}
    it["risk_score"] = sum(comp[k] * v for k, v in weights.items()) * 100
    for k in weights:
        it[f"c_{k}"] = (comp[k] * weights[k] * 100).round(1)

    rec = mg[mg.recommended].set_index("work_type")
    it["recommended_method"] = it.category.map(rec.repair_method)
    it["est_cost_inr"] = it.category.map(rec.std_cost_inr).round(-2)
    it["method_reopen_rate"] = it.category.map(rec.reopen)
    dlp_free = (it.under_dlp == "Y") & it.category.isin(SURFACE_WORK)
    it["who_pays"] = np.where(dlp_free, "Original contractor (DLP)", "BMC ward budget")
    it["cost_to_bmc_inr"] = np.where(dlp_free, 0, it.est_cost_inr)

    def why(r):
        bits = [f"{r.category.lower()} reported {r.complaints}× ({int(r.upvotes)} upvotes)"]
        if r.flood_hotspots:
            bits.append(f"at flood hotspot {r.flood_hotspots.split('; ')[0]}")
        if r.facilities:
            fl = r.facilities.split("; ")
            hosp = [x for x in fl if "hospital" in x.lower()]
            lead = (hosp or fl)[0].replace(" (synthetic)", "")
            bits.append(f"access road for {lead}" + (f" and {len(fl)-1} other school(s)/hospital(s)" if len(fl) > 1 else ""))
        if r.road_condition_accidents:
            bits.append(f"{int(r.road_condition_accidents)} accident(s) blamed on road condition")
        if r.failed_fixes:
            bits.append(f"{int(r.failed_fixes)} earlier fix(es) here failed within 30 days")
        if r.bus_route == "Y":
            bits.append("BEST bus route")
        return "; ".join(bits)
    it["why"] = it.apply(why, axis=1)
    it = it.sort_values(["ward_code", "risk_score"], ascending=[True, False])
    it["ward_rank"] = it.groupby("ward_code").cumcount() + 1

    # fund in rank order from remaining budget (+ recoveries where the ward is overspent)
    rem = ws.set_index("ward_code")
    funded = []
    for wc, grp in it.groupby("ward_code", sort=False):
        pot = max(rem.loc[wc, "remaining_inr"], 0)
        src = "remaining budget"
        if pot <= 0:
            pot, src = rem.loc[wc, "recoverable_inr"], "recoveries (over-billing, double billing, DLP)"
        used = 0
        for r in grp.itertuples():
            ok = used + r.cost_to_bmc_inr <= pot
            if ok:
                used += r.cost_to_bmc_inr
            funded.append((r.issue_id, "Fund now" if ok else "Next tranche", src))
    fz = pd.DataFrame(funded, columns=["issue_id", "decision", "funding_source"])
    it = it.merge(fz, on="issue_id")
    it["city_rank"] = it.risk_score.rank(ascending=False, method="first").astype(int)
    return it.sort_values(["ward_code", "ward_rank"]), roads



# ================================================================ template narratives (no-API fallback)
def template_narratives(ws, sc, flags, pl) -> dict:
    out = {"ward": {}, "contractor": {}}
    for w in ws.itertuples():
        f = flags[flags.ward_code == w.ward_code]
        ob = f[f.flag == "Over-billed vs rate card"]
        db = f[f.flag == "Possible double billing"]
        dl = f[(f.flag == "Paid during DLP") & (f.confidence == "High")]
        top = pl[pl.ward_code == w.ward_code].sort_values("ward_rank").head(2)
        over = w.spend_inr - w.budget_inr
        money = (f"Ward {w.ward_code} ({w.ward_name}) spent {inr(w.spend_inr)} of its {inr(w.budget_inr)} monsoon "
                 f"repair budget on {w.jobs} jobs" + (f", {inr(over)} over budget." if over > 0 else
                                                     f", leaving {inr(-over)}."))
        held = (f" {inr(w.failed_spend_inr)} went on fixes that failed within 30 days ({w.reopen:.0%} of jobs). "
                f"Repairs met their deadline {w.sla_met:.0%} of the time, against {w.sla_expected:.0%} expected for a ward "
                f"this flood-prone in this season.")
        concerns = []
        if len(ob):
            e = ob.sort_values("amount_at_issue_inr", ascending=False).iloc[0]
            concerns.append(f"{len(ob)} bill(s) ran more than 35% above the rate card (largest: {e.work_order_id})")
        if len(db):
            concerns.append(f"{len(db)} job(s) look billed twice ({db.iloc[0].work_order_id})")
        if len(dl):
            concerns.append(f"{len(dl)} road repair(s) were paid for while the road was still under its defect "
                            f"liability period, when the original contractor should have paid ({dl.iloc[0].work_order_id})")
        flagged = (" Flagged for review: " + "; ".join(concerns) + f". Up to {inr(w.recoverable_inr)} may be recoverable."
                   if concerns else " No bills were flagged.")
        nxt = ""
        if len(top):
            t = top.iloc[0]
            nxt = (f" Next rupee: {t.category.lower()} on {t.road_name} ({t.why}), using "
                   f"{str(t.recommended_method).lower()}"
                   + (", at the original contractor's cost under DLP." if t.cost_to_bmc_inr == 0 else
                      f", about {inr(t.cost_to_bmc_inr)}."))
        out["ward"][w.ward_code] = {"en": money + held + flagged + nxt}
    for c in sc.itertuples():
        f = flags[(flags.contractor_id == c.contractor_id) & (flags.flag == "Over-billed vs rate card")]
        speed = ("faster than expected" if c.sla_vs_expected_pts > 3 else
                 "slower than expected" if c.sla_vs_expected_pts < -3 else "about as expected")
        last = ("held up better than expected" if c.reopen_vs_expected_pts < -3 else
                "failed more often than expected" if c.reopen_vs_expected_pts > 3 else "held up about as expected")
        cost = (f"Most bills were close to the rate card (median {c.median_cost_ratio:.2f}×)"
                + (f", but {c.overbilled_jobs} were more than 35% above it (e.g. {f.sort_values('amount_at_issue_inr').iloc[-1].work_order_id})."
                   if c.overbilled_jobs >= 5 else "."))
        imp = ("bill to the rate card and explain every exception" if c.cost_grade in "CD" else
               "use longer-lasting methods to cut re-opened repairs" if c.durability_grade in "CD" else
               "meet SLA deadlines more often" if c.speed_grade in "CD" else
               "keep evidence (photos, measurements) on every job")
        out["contractor"][c.contractor_id] = {"en": (
            f"{c.contractor_name} did {c.jobs} jobs in {c.wards} wards for {inr(c.billed_inr)}. "
            f"Speed: met the deadline on {c.sla_met:.0%} of jobs vs {c.sla_expected:.0%} expected for the same wards, rain and "
            f"severity, so {speed}. Durability: {c.reopen:.0%} of repairs re-opened within 30 days vs {c.reopen_expected:.0%} "
            f"expected for the same methods and wards, so repairs {last}. {cost} One thing to improve: {imp}.")}
    return out

# ================================================================ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="folder with the hackathon CSVs")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent / "out"))
    ap.add_argument("--app", default=None, help="also write the standalone dashboard bundle (data.js) here")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(exist_ok=True)
    d = load(Path(a.data))

    cc, issues, ev = connect(d)
    wo, flags = audit(d)
    w = context(d, wo)
    sc = scorecards(d, w, flags)
    ws = ward_summary(d, w, flags)
    mg = method_guide(w, d["rate_card"])
    pl, roads = plan(d, w, issues, mg, ws)
    ws["open_issues"] = ws.ward_code.map(pl.groupby("ward_code").size()).fillna(0).astype(int)

    flags.to_csv(out / "audit_flags.csv", index=False)
    sc.to_csv(out / "contractor_scorecard.csv", index=False)
    ws.drop(columns=["by_contractor", "by_method"]).to_csv(out / "ward_summary.csv", index=False)
    pl.to_csv(out / "next_rupee_plan.csv", index=False)
    mg.to_csv(out / "method_guide.csv", index=False)
    cc.to_csv(out / "complaints_clean.csv", index=False)
    issues.to_csv(out / "issues.csv", index=False)
    (out / "linker_eval.json").write_text(json.dumps(ev, indent=2))

    # ---- bundle for the dashboard
    def rec(df, cols=None):
        df = df if cols is None else df[cols]
        return json.loads(df.to_json(orient="records", date_format="iso"))

    wo_cols = ["work_order_id", "linked_complaint_ids", "ward_code", "road_id", "road_name", "work_type",
               "repair_method", "contractor_id", "contractor_name", "assigned_at", "completed_at", "area_sqm",
               "cost_inr", "expected_inr", "cost_ratio", "sla_hours", "hours_to_fix", "sla_met",
               "reopened_within_30d", "under_dlp", "engineer_remark"]
    c_cols = ["complaint_id", "received_at", "channel", "category_reported", "clean_category", "description",
              "language", "locality_text", "ward_final", "road_id_final", "status", "upvotes", "work_order_id"]
    summ = {
        "total_spend_inr": int(wo.cost_inr.sum()), "total_budget_inr": int(d["wards"].monsoon_repair_budget_inr_2025.sum()),
        "jobs": int(len(wo)), "failed_spend_inr": int(wo[wo.reopened].cost_inr.sum()),
        "reopen_rate": float(wo.reopened.mean()), "sla_rate": float(wo.sla_ok.mean()),
        "flags": flags.groupby(["flag", "confidence"]).agg(n=("work_order_id", "size"),
                                                           amount=("amount_at_issue_inr", "sum")).reset_index().to_dict("records"),
        "linker": ev,
    }
    narratives = {}
    np_path = out / "narratives.json"
    if np_path.exists():
        narratives = json.loads(np_path.read_text())
    bundle = dict(summary=summ, wards=rec(ws), contractors=rec(sc), flags=rec(flags), plan=rec(pl),
                  methods=rec(mg), work_orders=rec(w, wo_cols), complaints=rec(cc, c_cols),
                  roads=rec(roads, ["road_id", "road_name", "ward_code", "road_type", "under_dlp", "bus_route",
                                    "start_lat", "start_lon", "end_lat", "end_lon"]),
                  narratives=narratives, narratives_template=template_narratives(ws, sc, flags, pl))
    if a.app:
        app = Path(a.app)
        app.mkdir(exist_ok=True)
        (app / "data.js").write_text("window.DATA=" + json.dumps(bundle, ensure_ascii=False, default=str) + ";")

    # ---- console report
    print("CONNECT", json.dumps(ev, indent=1))
    print("\nAUDIT FLAGS")
    print(flags.groupby(["flag", "confidence"]).agg(n=("work_order_id", "size"), inr=("amount_at_issue_inr", "sum")))
    print("\nSCORECARD")
    print(sc[["contractor_id", "jobs", "sla_met", "sla_expected", "reopen", "reopen_expected", "overbilled_jobs",
              "double_billed_jobs", "dlp_surface_jobs", "overall_score", "overall_grade"]].round(3).to_string(index=False))
    print("\nMETHODS\n", mg[["work_type", "repair_method", "jobs", "reopen", "std_cost_inr", "cost_per_lasting_fix", "recommended"]].round(3).to_string(index=False))
    print("\nTOP 15 CITY ISSUES")
    print(pl.sort_values("city_rank").head(15)[["city_rank", "ward_code", "road_name", "category", "risk_score", "decision", "who_pays"]].to_string(index=False))


if __name__ == "__main__":
    main()

"""Build public/data/*.json for the Corporator view.

Usage: PYTHONUTF8=1 python scripts/build_data.py <dataset_dir>
pandas + stdlib only. All asserts run before any file is written.
"""
import json
import math
import re
import statistics
import sys
from pathlib import Path

import pandas as pd

BUCKETS = ('twin', 'over', 'fail', 'held')
TEMPLATE_SOURCE = 'template (Claude unavailable)'


def load(dataset_dir):
    d = {}
    for p in sorted(Path(dataset_dir).glob('*.csv')):
        if p.stem == 'complaints_sample_200':
            continue
        d[p.stem] = pd.read_csv(p, dtype=str, keep_default_na=False)
    return d


def tag_work_orders(d):
    w = d['work_orders'].copy()
    roads = d['roads'].set_index('road_id')
    rate = d['rate_card'].set_index('repair_method')
    con = d['contractors'].set_index('contractor_id')

    w['cost_inr'] = w.cost_inr.astype(int)
    w['area_sqm'] = w.area_sqm.astype(float)
    w['sla_hours'] = w.sla_hours.astype(int)
    w['unit'] = w.repair_method.map(rate.unit)
    w['standard_rate_inr'] = w.repair_method.map(rate.standard_rate_inr).astype(int)
    per_sqm = w.unit == 'per sqm'
    expected = (w.standard_rate_inr * w.area_sqm).where(per_sqm, w.standard_rate_inr)
    w['expected_inr'] = expected.round(2)
    w['ratio'] = (w.cost_inr / expected).round(3)
    w['flag_overbilled'] = (w.cost_inr / expected) >= 1.4

    w['assigned_dt'] = pd.to_datetime(w.assigned_at, format='%Y-%m-%d %H:%M')
    w['road_name'] = w.road_id.map(roads.road_name)
    w['under_dlp'] = w.road_id.map(roads.under_dlp) == 'Y'
    w['contractor_since'] = w.contractor_id.map(con.empanelled_since).astype(int)
    w['sla_met'] = w.sla_met == 'Y'
    w['reopened'] = w.reopened_within_30d == 'Y'
    w['exp_fail'] = w.repair_method.map(w.groupby('repair_method').reopened.mean()).round(4)
    w['complaint_ids'] = w.linked_complaint_ids.apply(lambda s: s.split('|') if s else [])
    w['flag_dlp_review'] = w.under_dlp & per_sqm

    # twins: unlinked row with a same road/method/contractor row assigned within +-10 days
    flag_twin, twin_of = [], []
    groups = {k: g for k, g in w.groupby(['road_id', 'repair_method', 'contractor_id'])}
    for _, r in w.iterrows():
        if r.linked_complaint_ids != '':
            flag_twin.append(False)
            twin_of.append(None)
            continue
        g = groups[(r.road_id, r.repair_method, r.contractor_id)]
        g = g[g.work_order_id != r.work_order_id]
        g = g[(g.assigned_dt - r.assigned_dt).abs() <= pd.Timedelta(days=10)]
        flag_twin.append(len(g) > 0)
        linked = g[g.linked_complaint_ids != '']
        if len(linked):
            dist = (linked.assigned_dt - r.assigned_dt).abs()
            twin_of.append(linked.loc[dist.sort_values(kind='stable').index[0]].work_order_id)
        else:
            twin_of.append(None)
    w['flag_twin'] = flag_twin
    w['twin_of'] = twin_of

    cost = w.cost_inr.astype(float)
    w['b_twin'] = cost.where(w.flag_twin, 0.0)
    w['b_over'] = (cost - 1.3 * expected).where(w.flag_overbilled & ~w.flag_twin, 0.0).round(2)
    rem = cost - w.b_twin - w.b_over
    w['b_fail'] = rem.where(w.reopened, 0.0).round(2)
    w['b_held'] = (rem - w.b_fail).round(2)

    out = w.rename(columns={'work_order_id': 'id', 'ward_code': 'ward', 'engineer_remark': 'remark'})
    out['work_started_at'] = out.work_started_at.replace('', None)
    out['completed_at'] = out.completed_at.replace('', None)
    cols = ['id', 'ward', 'road_id', 'road_name', 'under_dlp', 'work_type', 'repair_method', 'unit',
            'standard_rate_inr', 'contractor_id', 'contractor_name', 'contractor_since', 'assigned_at',
            'work_started_at', 'completed_at', 'area_sqm', 'cost_inr', 'expected_inr', 'ratio',
            'sla_hours', 'sla_met', 'reopened', 'exp_fail', 'complaint_ids', 'remark',
            'flag_overbilled', 'flag_twin', 'twin_of', 'flag_dlp_review',
            'b_twin', 'b_over', 'b_fail', 'b_held']
    return out[cols].sort_values('id').reset_index(drop=True)


def ward_summaries(wo, d):
    rows = []
    for _, r in d['wards'].sort_values('ward_code').iterrows():
        g = wo[wo.ward == r.ward_code]
        spend = int(g.cost_inr.sum())
        budget = int(r.monsoon_repair_budget_inr_2025)
        b = {k: int(round(g['b_' + k].sum())) for k in ('twin', 'over', 'fail')}
        b['held'] = spend - sum(b.values())
        dlp = g[g.flag_dlp_review]
        dlp_inr = int(dlp.cost_inr.sum())
        missed = int((~g.sla_met).sum())
        rows.append({
            'ward_code': r.ward_code, 'ward_name': r.ward_name, 'zone': r.zone,
            'population_est': int(r.population_est), 'area_km2': float(r.approx_area_km2),
            'low_lying_index': float(r.low_lying_index), 'engineering_crews': int(r.engineering_crews),
            'localities': [s.strip() for s in r.localities.split(';') if s.strip()],
            'budget_inr': budget, 'spend_inr': spend,
            'spend_pct_of_budget': round(100 * spend / budget, 1),
            'jobs': len(g), 'buckets': b,
            'per100': {k: round(100 * b[k] / spend, 2) for k in BUCKETS},
            'dlp_review_inr': dlp_inr, 'dlp_review_jobs': len(dlp),
            'dlp_review_per100': round(100 * dlp_inr / spend, 2),
            'fail_rate': round(float(g.reopened.mean()), 4),
            'expected_fail_rate': round(float(g.exp_fail.mean()), 4),
            'sla_missed': missed, 'sla_missed_rate': round(missed / len(g), 4),
        })
    med = statistics.median
    medians = {
        'spend_pct_of_budget': med(x['spend_pct_of_budget'] for x in rows),
        'per100': {k: med(x['per100'][k] for x in rows) for k in BUCKETS},
        'dlp_review_per100': med(x['dlp_review_per100'] for x in rows),
        'fail_rate': med(x['fail_rate'] for x in rows),
        'expected_fail_rate': med(x['expected_fail_rate'] for x in rows),
        'sla_missed_rate': med(x['sla_missed_rate'] for x in rows),
    }
    return {'medians': medians, 'wards': rows}


def _inr(n):
    return '₹{:,}'.format(int(round(n)))


def template_brief(ward, wo_ward, medians):
    code = ward['ward_code']
    p = ward['per100']
    ids = []
    status = 'over' if ward['spend_inr'] > ward['budget_inr'] else 'within'
    parts = [
        f"Ward {code} spent {_inr(ward['spend_inr'])} against a {_inr(ward['budget_inr'])} budget "
        f"({ward['spend_pct_of_budget']:.0f}%, {status} budget). Of every ₹100, about "
        f"₹{p['twin']:.0f} went to apparent repeat jobs, ₹{p['over']:.0f} to billing above the rate card, "
        f"₹{p['fail']:.0f} to repairs that failed within 30 days and ₹{p['held']:.0f} to repairs that held up."]
    tw = wo_ward[wo_ward.flag_twin]
    if len(tw):
        r = tw.loc[tw.cost_inr.idxmax()]
        ids.append(r.id)
        parts.append(f"Should the committee ask why {r.id} looks like a repeat of the same repair on "
                     f"{r.road_name} ({_inr(r.cost_inr)}, no linked complaint)?")
    ov = wo_ward[wo_ward.b_over > 0]
    if len(ov):
        r = ov.loc[ov.b_over.idxmax()]
        ids.append(r.id)
        parts.append(f"Why was {r.id} billed {_inr(r.cost_inr)} when the rate card gives {_inr(r.expected_inr)} "
                     f"({r.ratio:.2f}x)?")
    dl = wo_ward[wo_ward.flag_dlp_review]
    if len(dl):
        r = dl.loc[dl.cost_inr.idxmax()]
        ids.append(r.id)
        parts.append(f"{r.road_name} appears to be under its defect liability period; should the original "
                     f"contractor have done {r.id} ({_inr(r.cost_inr)}) at no cost to BMC?")
    parts.append(
        f"Why did {ward['fail_rate'] * 100:.0f}% of repairs here fail within 30 days when the expected rate for "
        f"this mix of methods is {ward['expected_fail_rate'] * 100:.0f}% (ward median "
        f"{medians['fail_rate'] * 100:.0f}%)?")
    return ' '.join(parts), list(dict.fromkeys(ids))


CLAUDE_MODEL = 'claude-opus-5-5'
WO_ID_RE = re.compile(r'WO25-\d{5}')


def claude_text(prompt, max_tokens=600):
    """Return Claude's text, or None when there is no key or on any error. Key comes from the environment only."""
    import os
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        # Opus 5.5 always thinks; thinking tokens count toward max_tokens, so keep effort low
        # and leave headroom above the visible-text budget.
        resp = client.messages.create(
            model=CLAUDE_MODEL, max_tokens=max_tokens + 2000,
            output_config={'effort': 'low'},
            messages=[{'role': 'user', 'content': prompt}])
        if resp.stop_reason != 'end_turn':
            print(f'claude_text: stop_reason={resp.stop_reason}')
            return None
        text = ''.join(b.text for b in resp.content if b.type == 'text').strip()
        return text or None
    except Exception as e:  # never print the key or the message (may echo headers)
        print(f'claude_text failed: {type(e).__name__}')
        return None


def scrub_wo_ids(text, allowed):
    """Drop WO ids not in `allowed`, tidy leftovers. Returns (clean_text, sorted kept ids)."""
    clean = WO_ID_RE.sub(lambda m: m.group(0) if m.group(0) in allowed else '', text)
    clean = re.sub(r'\(\s*[,;/ ]*\)', '', clean)           # empty parens
    clean = re.sub(r'\(\s*[,;]\s*', '(', clean)            # "(, WO25-1)" leftovers
    clean = re.sub(r'\s*[,;]\s*(?=[,;)])', '', clean)      # doubled separators
    clean = re.sub(r'[ \t]{2,}', ' ', clean)
    clean = re.sub(r'[ \t]+([.,;:?!)])', r'\1', clean)
    clean = re.sub(r'[ \t]+\n', '\n', clean).strip()
    return clean, sorted(set(WO_ID_RE.findall(clean)) & set(allowed))


def _selftest_scrub():
    t, ids = scrub_wo_ids('Check WO25-00004 and WO25-99999 (WO25-99998).', {'WO25-00004'})
    assert 'WO25-99999' not in t and 'WO25-99998' not in t and '()' not in t, t
    assert ids == ['WO25-00004']


def _brief_prompt(w, wo_ward, medians):
    p = w['per100']
    rows = []
    sent = []

    def add(label, g):
        for r in g.itertuples():
            sent.append(r.id)
            rows.append(f"- {label} {r.id}: {r.road_name}, {r.contractor_name}, {r.repair_method}, "
                        f"billed {_inr(r.cost_inr)}, rate card {_inr(r.expected_inr)} ({r.ratio:.2f}x)")
    add('repeat-job candidate', wo_ward[wo_ward.flag_twin])
    add('billed above rate card', wo_ward[wo_ward.b_over > 0].nlargest(5, 'b_over'))
    add('surface repair on road under DLP', wo_ward[wo_ward.flag_dlp_review].nlargest(5, 'cost_inr'))
    sent = list(dict.fromkeys(sent))
    prompt = (
        f"You are drafting a monsoon road-repair brief for a Mumbai ward committee.\n"
        f"Ward {w['ward_code']} ({w['ward_name']}): spent {_inr(w['spend_inr'])} against a "
        f"{_inr(w['budget_inr'])} budget. Per Rs 100 spent: {p['twin']:.1f} on apparent repeat jobs, "
        f"{p['over']:.1f} on billing above the rate card, {p['fail']:.1f} on repairs that failed within 30 days, "
        f"{p['held']:.1f} on repairs that held. DLP-review spend {_inr(w['dlp_review_inr'])}. "
        f"Failure rate {w['fail_rate'] * 100:.0f}% vs expected {w['expected_fail_rate'] * 100:.0f}% "
        f"(ward median {medians['fail_rate'] * 100:.0f}%).\n"
        f"Flagged work orders:\n" + ('\n'.join(rows) or '(none)') + "\n\n"
        "Write a ~150-word committee brief in plain language, written as questions for the committee, "
        "with no accusations. Use only the numbers and work-order ids given above. "
        "Output the brief text only.")
    return prompt, set(sent)


def _social_prompt(posts):
    lines = '\n'.join('- ' + ' '.join(p['text'].split()) for p in posts[:20])
    return ("Below are social media posts matched to one Mumbai ward. Summarise what citizens are saying about "
            "roads in exactly 3 lines (one sentence each, separated by newlines, no bullets, no preamble).\n\n"
            + lines)


def build_briefs(wards_file, wo, social=None):
    out = {}
    n_claude = 0
    for w in wards_file['wards']:
        code = w['ward_code']
        wo_ward = wo[wo.ward == code]
        text, ids = template_brief(w, wo_ward, wards_file['medians'])
        posts = [p for p in (social or []) if p['ward'] == code]
        summary = template_social_summary(posts) if social is not None else ''
        entry = {'source': TEMPLATE_SOURCE, 'brief': text, 'social_summary': summary, 'wo_ids': ids}
        if social is not None and posts:
            prompt, allowed = _brief_prompt(w, wo_ward, wards_file['medians'])
            raw_brief = claude_text(prompt)
            raw_social = claude_text(_social_prompt(posts)) if raw_brief else None
            if raw_brief and raw_social:
                clean, kept = scrub_wo_ids(raw_brief, allowed)
                lines = [ln.strip() for ln in raw_social.splitlines() if ln.strip()]
                if clean and lines:
                    entry = {'source': 'claude', 'brief': clean, 'social_summary': '\n'.join(lines[:3]),
                             'wo_ids': kept}
                    n_claude += 1
        out[code] = entry
    print(f'briefs: {n_claude} claude, {len(out) - n_claude} template')
    return out


def run_asserts_core(wo, wards_file, briefs):
    assert len(wo) == 2499
    assert wo.flag_overbilled.sum() == 111
    assert wo.flag_twin.sum() == 45
    tw = wo.set_index('id').twin_of
    assert tw['WO25-02485'] == 'WO25-00057' and tw['WO25-02472'] == 'WO25-00373'
    assert ((wo.b_twin + wo.b_over + wo.b_fail + wo.b_held - wo.cost_inr).abs() < 0.011).all()
    assert wo.flag_dlp_review.sum() == 259 and wo.loc[wo.flag_dlp_review, 'cost_inr'].sum() == 6026225
    for w in wards_file['wards']:
        assert abs(sum(w['buckets'].values()) - w['spend_inr']) <= 1, w['ward_code']
    e = next(w for w in wards_file['wards'] if w['ward_code'] == 'E')
    assert e['spend_inr'] == 6322991 and e['budget_inr'] == 5300000
    assert [round(e['per100'][k], 2) for k in ('twin', 'over', 'fail', 'held')] == [1.11, 5.66, 29.54, 63.70]
    assert round(wards_file['medians']['per100']['held']) == 72
    assert len(wards_file['wards']) == 24
    ids = set(wo.id)
    for code, b in briefs.items():
        assert set(b['wo_ids']) <= ids, code
        assert set(re.findall(r'WO25-\d{5}', b['brief'])) <= ids, code
        assert b['source'] in ('claude', TEMPLATE_SOURCE)


# ---------------------------------------------------------------- Task 2: rest

ROAD_CAUSES = ['Pothole', 'Uneven road / open chamber', 'Waterlogged road', 'Skid on wet road']
WINDOW_DAYS = 45
OPEN_STATUS = ('Open', 'In Progress')
WEIGHTS = {'complaints': 0.25, 'severity': 0.10, 'failed_repairs': 0.20, 'flood': 0.15,
           'traffic': 0.10, 'accidents': 0.15, 'facilities': 0.05}
SEV_PTS = {'Fatal': 5, 'Grievous': 3, 'Minor': 1}
NEXT_RUPEE_RULE = (
    'Candidates are roads in the ward with an open complaint placed on them or a failed repair. Each factor is '
    'scaled 0-1 across the city and combined with the listed weights into a 0-100 score. Roads are funded in score '
    'order while the cost fits: the remaining 2025 budget if the ward is under budget, otherwise the next ₹10 lakh. '
    'Surface repairs on roads still under DLP cost BMC ₹0.')


def haversine_m(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 2 * 6371000.0 * math.asin(math.sqrt(a))


def _names(row):
    return [row.locality] + [a.strip() for a in row.aliases.split(';') if a.strip()]


def locality_index(d):
    exact, flat = {}, []
    for r in d['localities'].itertuples():
        for n in _names(r):
            key = n.strip().lower()
            exact.setdefault(key, (r.ward_code, float(r.lat), float(r.lon)))
            flat.append((key, r.ward_code, float(r.lat), float(r.lon)))
    return exact, flat


def lookup_locality(text, idx):
    exact, flat = idx
    t = (text or '').strip().lower()
    if not t:
        return None
    if t in exact:
        return exact[t]
    cands = [(w, la, lo) for n, w, la, lo in flat if n.startswith(t + ' ') or n.startswith(t + '(')]
    if cands and len({c[0] for c in cands}) == 1:
        return cands[0]
    return None


def _roads_num(d):
    r = d['roads'].copy()
    for c in ('start_lat', 'start_lon', 'end_lat', 'end_lon'):
        r[c] = r[c].astype(float)
    r['mid_lat'] = (r.start_lat + r.end_lat) / 2
    r['mid_lon'] = (r.start_lon + r.end_lon) / 2
    return r


def nearest_road(lat, lon, ward, roads_df):
    best, best_d = None, None
    for r in roads_df[roads_df.ward_code == ward].itertuples():
        dist = min(haversine_m(lat, lon, r.start_lat, r.start_lon), haversine_m(lat, lon, r.end_lat, r.end_lon),
                   haversine_m(lat, lon, r.mid_lat, r.mid_lon))
        if best_d is None or dist < best_d:
            best, best_d = r.road_id, dist
    return best


def build_complaints(d):
    idx = locality_index(d)
    roads = _roads_num(d)
    cen = [(r.ward_code, float(r.centroid_lat), float(r.centroid_lon)) for r in d['wards'].itertuples()]
    out = []
    src_n, place_n = {}, {}
    for r in d['complaints'].itertuples():
        lat = float(r.lat) if r.lat != '' else None
        lon = float(r.lon) if r.lon != '' else None
        loc = lookup_locality(r.locality_text, idx)
        if r.ward_code:
            ward, src = r.ward_code, 'given'
        elif loc:
            ward, src = loc[0], 'locality'
        elif lat is not None:
            ward, src = min(cen, key=lambda c: haversine_m(lat, lon, c[1], c[2]))[0], 'centroid'
        else:
            ward, src = None, None
        is_open = r.status in OPEN_STATUS
        road_id = placement = None
        if is_open:
            if lat is not None and ward:
                placement, road_id = 'gps', nearest_road(lat, lon, ward, roads)
            elif loc and loc[0] == ward:
                placement, road_id = 'locality', nearest_road(loc[1], loc[2], ward, roads)
            else:
                placement = 'ward'
        src_n[src] = src_n.get(src, 0) + 1
        if is_open:
            place_n[placement] = place_n.get(placement, 0) + 1
        out.append({
            'id': r.complaint_id, 'received_at': r.received_at, 'channel': r.channel,
            'category': r.category_reported, 'description': r.description[:200], 'language': r.language,
            'locality_text': r.locality_text, 'ward': ward, 'ward_source': src,
            'lat': lat, 'lon': lon, 'upvotes': int(r.upvotes), 'status': r.status,
            'resolved_at': r.resolved_at or None, 'is_open': is_open,
            'road_id': road_id, 'placement': placement})
    print(f'complaints ward_source={src_n} open placement={place_n}')
    return sorted(out, key=lambda c: c['id'])


def build_accidents(d, wo):
    w = wo[wo.completed_at.notna()].copy()
    w['done'] = pd.to_datetime(w.completed_at, format='%Y-%m-%d %H:%M')
    by_road = {k: g for k, g in w.groupby('road_id')}
    rows = []
    for r in d['accidents'].itertuples():
        caused = r.probable_cause in ROAD_CAUSES
        failed, held = [], []
        if caused and r.road_id in by_road:
            g = by_road[r.road_id]
            gap = pd.to_datetime(r.occurred_at, format='%Y-%m-%d %H:%M') - g.done
            g = g[(gap > pd.Timedelta(0)) & (gap <= pd.Timedelta(days=WINDOW_DAYS))]
            failed = sorted(g[g.reopened].id)
            held = sorted(g[~g.reopened].id)
        # an accident can follow both a failed and a held repair on the same road; the UI says so
        rows.append({
            'id': r.accident_id, 'occurred_at': r.occurred_at, 'ward': r.ward_code, 'road_id': r.road_id or None,
            'lat': float(r.lat), 'lon': float(r.lon), 'vehicle_type': r.vehicle_type, 'severity': r.severity,
            'cause': r.probable_cause, 'road_caused': caused,
            'after_failed_repair': bool(failed), 'after_held_repair': bool(held),
            'failed_wo_ids': failed, 'held_wo_ids': held})
    rows.sort(key=lambda a: a['id'])
    return {'window_days': WINDOW_DAYS, 'road_causes': ROAD_CAUSES,
            'city': {'failed_repairs': int(wo.reopened.sum()), 'held_repairs': int((~wo.reopened).sum()),
                     'after_failed': sum(a['after_failed_repair'] for a in rows),
                     'after_held': sum(a['after_held_repair'] for a in rows)},
            'rows': rows}


def build_context(d, complaints):
    rain = d['rainfall_daily'].copy()
    rain['dt'] = pd.to_datetime(rain.date)
    rain['mm'] = rain.rainfall_mm.astype(float)

    def monday(ts):
        return (ts - pd.Timedelta(days=ts.weekday())).normalize()

    def key(ts):
        return monday(ts).strftime('%Y-%m-%d')

    weeks = {}
    for ws in pd.date_range(monday(rain.dt.min()), monday(rain.dt.max()), freq='7D'):
        k = ws.strftime('%Y-%m-%d')
        weeks[k] = {'week_start': k, 'santacruz_mm': 0.0, 'colaba_mm': 0.0, 'red_alert_days': [],
                    'big_tide_days': [], 'complaints': {}}
    for r in rain.itertuples():
        w = weeks[key(r.dt)]
        if r.station in ('Santacruz', 'Colaba'):
            w[r.station.lower() + '_mm'] += r.mm
        if r.imd_alert == 'Red' and r.date not in w['red_alert_days']:
            w['red_alert_days'].append(r.date)
    for r in d['tides'].itertuples():
        w = weeks.get(key(pd.Timestamp(r.date)))
        if r.big_tide_flag == 'Y' and w is not None and r.date not in w['big_tide_days']:
            w['big_tide_days'].append(r.date)
    for c in complaints:
        if c['ward'] is None:
            continue
        w = weeks.get(key(pd.Timestamp(c['received_at'][:10])))
        if w is not None:
            w['complaints'][c['ward']] = w['complaints'].get(c['ward'], 0) + 1
    out = []
    for k in sorted(weeks):
        w = weeks[k]
        w['santacruz_mm'] = round(w['santacruz_mm'], 1)
        w['colaba_mm'] = round(w['colaba_mm'], 1)
        w['red_alert_days'].sort()
        w['big_tide_days'].sort()
        w['complaints'] = dict(sorted(w['complaints'].items()))
        out.append(w)
    return {'weeks': out}


_DEVANAGARI = re.compile('[ऀ-ॿ]')


def build_social(d):
    needles = {}  # lower needle -> (ward, canonical locality)
    for r in d['localities'].itertuples():
        for n in _names(r):
            k = n.strip().lower()
            if _DEVANAGARI.search(k) or len(k) >= 4:
                needles.setdefault(k, (r.ward_code, r.locality))
    pats = []
    for k, val in needles.items():
        if _DEVANAGARI.search(k):
            pats.append((k, val, None))
        else:
            pats.append((k, val, re.compile(r'(?<![a-z])' + re.escape(k) + r'(?![a-z])')))
    out = []
    for r in d['social_posts'].itertuples():
        t = r.text.lower()
        best = None
        for k, val, pat in pats:
            hit = (k in t) if pat is None else bool(pat.search(t))
            if hit and (best is None or len(k) > len(best[0])):
                best = (k, val)
        out.append({'id': r.post_id, 'posted_at': r.posted_at, 'source': r.source, 'author': r.author_handle,
                    'text': r.text, 'has_media': r.has_media == 'Y', 'engagement': int(r.likes_or_forwards),
                    'ward': best[1][0] if best else None, 'locality': best[1][1] if best else None})
    return sorted(out, key=lambda p: p['id'])


def _flat_rings(geom):
    polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    return [[[round(x, 5), round(y, 5)] for x, y in ring] for poly in polys for ring in poly]


def build_geo(d, dataset_dir):
    wj = json.loads((Path(dataset_dir) / 'wards.geojson').read_text(encoding='utf-8'))
    rj = json.loads((Path(dataset_dir) / 'roads.geojson').read_text(encoding='utf-8'))
    wards = [{'ward_code': f['properties']['ward_code'], 'ward_name': f['properties']['ward_name'],
              'zone': f['properties']['zone'], 'rings': _flat_rings(f['geometry'])} for f in wj['features']]
    roads = [{'road_id': f['properties']['road_id'], 'ward': f['properties']['ward_code'],
              'road_name': f['properties']['road_name'], 'road_type': f['properties']['road_type'],
              'coords': [[round(x, 5), round(y, 5)] for x, y in f['geometry']['coordinates']]}
             for f in rj['features']]
    hot = [{'id': r.hotspot_id, 'name': r.name, 'ward': r.ward_code, 'lat': float(r.lat), 'lon': float(r.lon),
            'tide_sensitive': r.tide_sensitive == 'Y', 'threshold_mm': float(r.flood_threshold_mm_per_day),
            'years_flagged': int(r.years_flagged_last_5)} for r in d['flood_hotspots'].itertuples()]
    fac = [{'id': r.facility_id, 'type': r.type, 'name': r.name, 'ward': r.ward_code, 'lat': float(r.lat),
            'lon': float(r.lon), 'ambulance_entry_road': r.ambulance_entry_road or None}
           for r in d['facilities'].itertuples()]
    return {'wards': sorted(wards, key=lambda x: x['ward_code']), 'roads': sorted(roads, key=lambda x: x['road_id']),
            'hotspots': sorted(hot, key=lambda x: x['id']), 'facilities': sorted(fac, key=lambda x: x['id'])}


def _plural(n, word):
    return f'{n} {word}' + ('' if n == 1 else 's')


def build_next_rupee(d, wo, wards_file, complaints, accidents, geo):
    roads = _roads_num(d).set_index('road_id')
    traffic = d['traffic'].set_index('road_id')
    t_cong = traffic.congestion_index_0_10.astype(float) / 10
    t_peak = traffic.peak_hour_vehicles.astype(float)
    t_peak = t_peak / t_peak.max()
    t_bus = traffic.bus_routes_count.astype(float)
    t_bus = t_bus / t_bus.max()
    hotspots = geo['hotspots']
    fac_by_road = {}
    for f in geo['facilities']:
        if f['ambulance_entry_road']:
            fac_by_road.setdefault(f['ambulance_entry_road'], []).append(f)

    open_by_road, acc_by_road, fail_by_road = {}, {}, {}
    for c in complaints:
        if c['is_open'] and c['road_id']:
            open_by_road.setdefault(c['road_id'], []).append(c)
    for a in accidents['rows']:
        if a['road_caused'] and a['road_id']:
            acc_by_road.setdefault(a['road_id'], []).append(a)
    for r in wo[wo.reopened].sort_values(['assigned_at', 'id']).itertuples():
        fail_by_road.setdefault(r.road_id, []).append(r)

    med_h = wo.groupby('work_type').sla_hours.median()
    hmin, hmax = med_h.min(), med_h.max()
    work_types = set(med_h.index)
    methods = {}  # work_type -> (method, unit, reopen rate, est cost)
    for wt, g in wo.groupby('work_type'):
        s = g.groupby('repair_method').reopened.agg(['mean', 'size'])
        s = s[s['size'] >= 10].sort_values(['mean'], kind='stable')
        m = s.index[0]
        gm = wo[wo.repair_method == m]
        unit = gm.unit.iloc[0]
        rate = int(gm.standard_rate_inr.iloc[0])
        cost = int(round(rate * float(gm.area_sqm.median()))) if unit == 'per sqm' else rate
        methods[wt] = (m, unit, round(float(s.loc[m, 'mean']), 4), cost)

    cand_ids = sorted(set(open_by_road) | set(fail_by_road))
    raw = {}
    for rid in cand_ids:
        rd = roads.loc[rid]
        opens = open_by_road.get(rid, [])
        fails = fail_by_road.get(rid, [])
        cats = {}
        for c in opens:
            if c['category'] in work_types:
                cats[c['category']] = cats.get(c['category'], 0) + 1
        if cats:
            wt = sorted(cats.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
        elif fails:
            wt = fails[-1].work_type
        else:
            wt = 'Pothole'
        pts = [(rd.start_lat, rd.start_lon), (rd.mid_lat, rd.mid_lon), (rd.end_lat, rd.end_lon)]
        hs = None
        for h in hotspots:
            m = min(haversine_m(la, lo, h['lat'], h['lon']) for la, lo in pts)
            if m <= 300 and (hs is None or m < hs[1]):
                hs = (h, m)
        accs = acc_by_road.get(rid, [])
        facs = fac_by_road.get(rid, [])
        ups = sum(c['upvotes'] for c in opens)
        raw[rid] = {
            'wt': wt, 'opens': opens, 'fails': fails, 'hs': hs, 'accs': accs, 'facs': facs, 'ups': ups,
            'c': {
                'complaints': len(opens) + 0.1 * ups,
                'severity': float(1 - (med_h[wt] - hmin) / (hmax - hmin)),
                'failed_repairs': float(len(fails)),
                'flood': (1.0 + (0.5 if hs[0]['tide_sensitive'] else 0.0)) if hs else 0.0,
                'traffic': float((t_cong[rid] + t_peak[rid] + t_bus[rid]) / 3) if rid in traffic.index else 0.0,
                'accidents': float(sum(SEV_PTS[a['severity']] for a in accs)),
                'facilities': float(sum(2 if f['type'] == 'Hospital' else 1 for f in facs))}}
    mx = {k: max((r['c'][k] for r in raw.values()), default=0) for k in WEIGHTS}

    wards = {}
    for w in wards_file['wards']:
        code = w['ward_code']
        cands = []
        for rid in cand_ids:
            rd = roads.loc[rid]
            if rd.ward_code != code:
                continue
            r = raw[rid]
            norm = {k: (r['c'][k] / mx[k] if mx[k] else 0.0) for k in WEIGHTS}
            comp = {k: round(v, 4) for k, v in norm.items()}
            score = round(100 * sum(WEIGHTS[k] * norm[k] for k in WEIGHTS), 1)
            m, unit, rate, cost = methods[r['wt']]
            under = rd.under_dlp == 'Y'
            dlp = under and unit == 'per sqm'
            reasons = []
            if r['opens']:
                reasons.append(f"{_plural(len(r['opens']), 'open complaint')} ({r['ups']} upvotes)")
            if r['fails']:
                reasons.append(_plural(len(r['fails']), 'failed repair'))
            if r['hs']:
                reasons.append(f"Flood hotspot {r['hs'][1]:.0f} m"
                               + (' (tide-sensitive)' if r['hs'][0]['tide_sensitive'] else ''))
            if comp['traffic']:
                reasons.append(f"Congestion {float(traffic.congestion_index_0_10[rid]):.1f}/10, "
                               f"{int(traffic.bus_routes_count[rid])} bus routes")
            if r['accs']:
                cnt = {s: sum(a['severity'] == s for a in r['accs']) for s in SEV_PTS}
                bits = ', '.join(f'{cnt[s]} {s.lower()}' for s in SEV_PTS if cnt[s])
                reasons.append(bits + ' road-caused ' + ('accident' if len(r['accs']) == 1 else 'accidents'))
            for f in r['facs']:
                reasons.append(f"Ambulance road for {f['name']}")
            if dlp:
                reasons.append('Under DLP: call original contractor, ₹0 to BMC')
            cands.append({
                'road_id': rid, 'road_name': rd.road_name, 'under_dlp': under, 'score': score, 'components': comp,
                'reasons': reasons, 'work_type': r['wt'], 'method': m, 'unit': unit, 'method_reopen_rate': rate,
                'est_cost_inr': cost, 'dlp_route': dlp, 'bmc_cost_inr': 0 if dlp else cost, 'funded': False,
                'open_complaint_ids': sorted(c['id'] for c in r['opens']),
                'failed_wo_ids': sorted(x.id for x in r['fails']),
                'accident_ids': sorted(a['id'] for a in r['accs']),
                'facility_ids': sorted(f['id'] for f in r['facs']),
                'hotspot_id': r['hs'][0]['id'] if r['hs'] else None,
                'hotspot_m': round(r['hs'][1]) if r['hs'] else None})
        cands.sort(key=lambda c: (-c['score'], c['road_id']))
        if w['spend_inr'] < w['budget_inr']:
            mode, budget = 'remaining', w['budget_inr'] - w['spend_inr']
        else:
            mode, budget = 'next_10L', 1_000_000
        left = budget
        alloc = 0
        for c in cands:
            if c['bmc_cost_inr'] <= left:
                c['funded'] = True
                left -= c['bmc_cost_inr']
                alloc += c['bmc_cost_inr']
        wards[code] = {'budget_mode': mode, 'budget_inr': budget, 'allocated_inr': alloc, 'candidates': cands}
    return {'weights': WEIGHTS, 'rule': NEXT_RUPEE_RULE, 'wards': wards}


def template_social_summary(posts):
    if not posts:
        return "No social posts matched this ward's localities."
    src = {}
    for p in posts:
        src[p['source']] = src.get(p['source'], 0) + 1
    mix = ', '.join(f'{n} {s}' for s, n in sorted(src.items(), key=lambda kv: (-kv[1], kv[0])))
    loc = {}
    for p in posts:
        if p['locality']:
            loc[p['locality']] = loc.get(p['locality'], 0) + 1
    top = ', '.join(f'{k} ({n})' for k, n in sorted(loc.items(), key=lambda kv: (-kv[1], kv[0]))[:3])
    best = max(posts, key=lambda p: (p['engagement'], p['id']))
    txt = ' '.join(best['text'].split())
    if len(txt) > 100:
        txt = txt[:97] + '...'
    return '\n'.join([f'{len(posts)} posts matched this ward ({mix}).',
                      f'Most mentioned localities: {top}.',
                      f'Most engaged post ({best["engagement"]}): "{txt}"'])


def run_asserts_rest(wards_file, complaints, acc, context, social, geo, nr):
    op = [c for c in complaints if c['is_open']]
    assert len(complaints) == 6501 and len(op) == 896
    assert sum(c['lat'] is not None for c in op) == 505
    assert all(c['placement'] is None for c in complaints if not c['is_open'])
    assert sum(a['road_caused'] for a in acc['rows']) == 241
    assert acc['city'] == {'failed_repairs': 611, 'held_repairs': 1888, 'after_failed': 112, 'after_held': 178}
    assert sum(a['after_failed_repair'] for a in acc['rows']) == 112
    assert len(geo['wards']) == 24 and len(geo['roads']) == 291
    assert len(social) == 650
    assert len(context['weeks']) > 0
    road_ward = {r['road_id']: r['ward'] for r in geo['roads']}
    for code, nw in nr['wards'].items():
        funded = [c for c in nw['candidates'] if c['funded']]
        assert sum(c['bmc_cost_inr'] for c in funded) == nw['allocated_inr'] <= nw['budget_inr'], code
        for c in nw['candidates']:
            assert road_ward[c['road_id']] == code
            assert c['open_complaint_ids'] or c['failed_wo_ids'], c['road_id']
            assert (c['bmc_cost_inr'] == 0) == c['dlp_route']
    assert set(nr['wards']) == {w['ward_code'] for w in wards_file['wards']}
    for w in wards_file['wards']:
        assert (nr['wards'][w['ward_code']]['budget_mode'] == 'remaining') == (w['spend_inr'] < w['budget_inr'])


def _clean(o):
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if o is None or o is pd.NA:
        return None
    if hasattr(o, 'item') and not isinstance(o, (str, bytes)):
        o = o.item()
    if isinstance(o, float) and o != o:
        return None
    return o


def write_json(name, obj):
    out = Path(__file__).resolve().parent.parent / 'public' / 'data'
    out.mkdir(parents=True, exist_ok=True)
    with open(out / name, 'w', encoding='utf-8') as f:
        json.dump(_clean(obj), f, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def main(argv):
    if len(argv) != 2:
        print('usage: build_data.py <dataset_dir>')
        return 2
    _selftest_scrub()
    d = load(argv[1])
    wo = tag_work_orders(d)
    wards_file = ward_summaries(wo, d)
    complaints = build_complaints(d)
    acc = build_accidents(d, wo)
    context = build_context(d, complaints)
    social = build_social(d)
    geo = build_geo(d, argv[1])
    nr = build_next_rupee(d, wo, wards_file, complaints, acc, geo)
    briefs = build_briefs(wards_file, wo, social)
    run_asserts_core(wo, wards_file, briefs)
    run_asserts_rest(wards_file, complaints, acc, context, social, geo, nr)
    write_json('work_orders.json', wo.to_dict('records'))
    write_json('wards.json', wards_file)
    write_json('briefs.json', briefs)
    write_json('complaints.json', complaints)
    write_json('accidents.json', acc)
    write_json('context.json', context)
    write_json('social.json', social)
    write_json('geo.json', geo)
    write_json('next_rupee.json', nr)
    e = next(w for w in wards_file['wards'] if w['ward_code'] == 'E')
    print(f"twins={int(wo.flag_twin.sum())} overbilled={int(wo.flag_overbilled.sum())} "
          f"dlp_rows={int(wo.flag_dlp_review.sum())} "
          f"dlp_inr={int(wo.loc[wo.flag_dlp_review, 'cost_inr'].sum())} wardE_per100={e['per100']}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))

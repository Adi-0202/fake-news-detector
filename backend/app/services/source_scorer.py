import os
import requests
import re
from urllib.parse import urlparse
from difflib import SequenceMatcher
from typing import List,Dict

PROTECTED_BRANDS = {
    "rbi.org.in", "pib.gov.in", "thehindu.com", "reuters.com", 
    "ndtv.com", "indiatoday.in", "bbc.com", "bloomberg.com", 
    "pib.gov", "timesofindia.indiatimes.com"
}

HIGH_RISK_TLDS = {
    ".xyz", ".top", ".click", ".biz", ".online", ".site", ".download", 
    ".loan", ".live", ".info", ".crazy", ".work"
}

OPEN_PAGERANK_API_KEY=os.getenv("OPEN_PAGERANK_API_KEY","")

def calculate_domain_entropy(domain: str) -> float:
    import math
    if not domain:
        return 0.0
    
    frequencies={char: domain.count(char) for char in set(domain)}
    entropy=0.0
    for count in frequencies.values():
        prob=count/len(domain)
        entropy-=prob*math.log2(prob)
    return entropy

def fetch_global_page_rank(domain: str) -> float:
    if not OPEN_PAGERANK_API_KEY:
        return 0.0
    
    url = f"https://openpagerank.com/api/v1.0/getPageRank?domains[]={domain}"
    headers = {"Authorization": OPEN_PAGERANK_API_KEY}

    try:
        response=requests.get(url, headers=headers, timeout=2.5)
        if response.status_code==200:
            data=response.json()
            rank_rows=data.get("response", [{}])
            if rank_rows:
                raw_rank = rank_rows[0].get("page_rank_integer", 0)
                return float(raw_rank) / 10.0  # Scale down to 0.0 - 1.0 metric range
    except Exception as network_err:
        print(f"PageRank API lookup bypassed natively: {network_err}")
    return 0.0

def score_single_source(url: str) -> float:
    if not url:
        return 0.0
        
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
    
        if domain.endswith((".gov.in", ".gov", ".edu.in", ".edu", ".nic.in", ".ac.in")):
            return 1.0
        if domain in PROTECTED_BRANDS:
            return 1.0

        # LAYER 2: Adversarial Heuristics & Defensive Shielding
        # A. Typosquatting Check via Gestalt Similarity matching
        for anchor in PROTECTED_BRANDS:
            similarity = SequenceMatcher(None, domain, anchor).ratio()
            if 0.78 <= similarity < 1.0:
                print(f"🛡️ Matrix Alert: Penalizing Typosquatting signature on '{domain}' -> matches '{anchor}'")
                return 0.10
                
        # B. Combosquatting brand injections
        for anchor in PROTECTED_BRANDS:
            brand_stem = anchor.split('.')[0]
            if brand_stem in domain and domain != anchor:
                print(f"🛡️ Matrix Alert: Penalizing Combosquatting sequence on '{domain}'")
                return 0.15

        # C. Structural Flag Penalty Checks
        base_heuristic_score = 0.65
        
        # Penalize cheap/unvetted spam TLD configurations
        for toxic_tld in HIGH_RISK_TLDS:
            if domain.endswith(toxic_tld):
                base_heuristic_score -= 0.35
                
        # Penalize excessive word dashes often used to bypass filters
        if domain.count('-') >= 3:
            base_heuristic_score -= 0.20
            
        # Penalize highly chaotic string configurations
        if calculate_domain_entropy(domain) > 4.2:
            base_heuristic_score -= 0.15

        # LAYER 3: Global Popularity API Verification 
        api_rank_weight = fetch_global_page_rank(domain)
        
        # If PageRank returns active indexing validation data, merge the vectors
        if api_rank_weight > 0.0:
            # Linear distribution merge: 40% structural rules, 60% global PageRank metrics
            final_score = (base_heuristic_score * 0.4) + (api_rank_weight * 0.6)
        else:
            # Safe degradable fallback if offline/unranked
            final_score = base_heuristic_score
            
        return max(0.0, min(1.0, final_score))
        
    except Exception as err:
        print(f"Source Scorer Failure on target URL '{url}': {err}")
        return 0.50


def evaluate_evidence_consensus(evidence_batch: List[Dict]) -> List[Dict]:
    """
    LAYER 4: Real-Time Content Consensus Engine.
    Cross-checks all extracted evidence blocks together. If multiple distinct 
    domains share highly similar lexical entities or matching vocabulary networks, 
    their joint occurrence boosts their individual trust profile ratings.
    """
    if not evidence_batch or len(evidence_batch) < 2:
        # If single result, score natively and return instantly
        for item in evidence_batch:
            item["credibility_score"] = round(score_single_source(item["url"]), 2)
        return evidence_batch

    # 1. Run Layer 1-3 baseline scoring assignments on all items
    for item in evidence_batch:
        item["credibility_score"] = score_single_source(item["url"])

    # 2. Extract unique text tokens to check overlap similarities between rows
    for i, item_a in enumerate(evidence_batch):
        words_a = set(re.findall(r'\w+', item_a["snippet"].lower()))
        if len(words_a) < 5:
            continue
            
        consensus_matches = 0
        domain_a = urlparse(item_a["url"]).netloc
        
        for j, item_b in enumerate(evidence_batch):
            if i == j:
                continue
                
            domain_b = urlparse(item_b["url"]).netloc
            if domain_a == domain_b:
                continue # Skip intra-domain duplicate cross-referencing
                
            words_b = set(re.findall(r'\w+', item_b["snippet"].lower()))
            
            # Compute Jaccard Overlap ratio between the two snippets
            intersection = words_a.intersection(words_b)
            union = words_a.union(words_b)
            overlap_ratio = len(intersection) / len(union) if union else 0.0
            
            # If snippets share substantial structural naming metrics (>22% overlap match)
            if overlap_ratio >= 0.22:
                consensus_matches += 1

        # 3. Apply consensus multiplier if independent networks corroborate findings
        if consensus_matches > 0:
            # Each distinct matching network grants a +10% boost up to a 1.0 ceiling
            boost_multiplier = 1.0 + (consensus_matches * 0.10)
            item["credibility_score"] = min(1.0, item["credibility_score"] * boost_multiplier)

    # Cleanly format output floating representations
    for item in evidence_batch:
        item["credibility_score"] = round(item["credibility_score"], 2)
        
    return evidence_batch
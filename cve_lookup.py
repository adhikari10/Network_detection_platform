"""
CVE Intelligence Lookup
Checks ports against NVD API and local cache.
Completely separate from LLM reasoning.
"""

import httpx
import json
import time
import os
from datetime import datetime, timedelta

# Local cache file
CACHE_FILE = "/home/shared/guardian-brain/cve_cache.json"
CACHE_TTL_HOURS = 24  # refresh cache every 24 hours

# NVD API - free, no key needed for basic use
NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# Local port→CVE seed database (fast fallback, works offline)
PORT_CVE_SEED = {
    21:   [{"cve_id": "CVE-2011-0762", "description": "vsftpd backdoor allows remote code execution", "cvss_score": 10.0, "service": "FTP"}],
    22:   [{"cve_id": "CVE-2023-38408", "description": "OpenSSH remote code execution via ssh-agent", "cvss_score": 9.8, "service": "SSH"}],
    23:   [{"cve_id": "CVE-2020-15778", "description": "Telnet command injection vulnerability", "cvss_score": 7.8, "service": "Telnet"}],
    80:   [{"cve_id": "CVE-2021-44228", "description": "Log4Shell - Apache Log4j remote code execution", "cvss_score": 10.0, "service": "HTTP"}],
    443:  [{"cve_id": "CVE-2022-22965", "description": "Spring4Shell - Spring Framework RCE", "cvss_score": 9.8, "service": "HTTPS"}],
    445:  [{"cve_id": "CVE-2017-0144", "description": "EternalBlue SMB exploit used in WannaCry ransomware", "cvss_score": 9.3, "service": "SMB"}],
    1433: [{"cve_id": "CVE-2020-0618", "description": "Microsoft SQL Server remote code execution", "cvss_score": 8.8, "service": "MSSQL"}],
    3306: [{"cve_id": "CVE-2012-2122", "description": "MySQL authentication bypass allows unauthorized access", "cvss_score": 5.1, "service": "MySQL"}],
    3389: [{"cve_id": "CVE-2019-0708", "description": "BlueKeep - RDP remote code execution, no auth required", "cvss_score": 9.8, "service": "RDP"}],
    5432: [{"cve_id": "CVE-2022-1552", "description": "PostgreSQL privilege escalation to superuser", "cvss_score": 8.8, "service": "PostgreSQL"}],
    6379: [{"cve_id": "CVE-2022-0543", "description": "Redis sandbox escape leads to remote code execution", "cvss_score": 10.0, "service": "Redis"}],
    8080: [{"cve_id": "CVE-2020-1938", "description": "Ghostcat - Apache Tomcat file read and inclusion", "cvss_score": 9.8, "service": "HTTP-Alt"}],
    8443: [{"cve_id": "CVE-2021-40438", "description": "Apache HTTP Server SSRF vulnerability", "cvss_score": 9.0, "service": "HTTPS-Alt"}],
    27017:[{"cve_id": "CVE-2021-32040", "description": "MongoDB denial of service via crafted query", "cvss_score": 7.5, "service": "MongoDB"}],
    5900: [{"cve_id": "CVE-2022-47966", "description": "VNC authentication bypass vulnerability", "cvss_score": 9.8, "service": "VNC"}],
}

def _cvss_to_severity(score: float) -> str:
    if score >= 9.0:
        return "critical"
    elif score >= 7.0:
        return "high"
    elif score >= 4.0:
        return "medium"
    else:
        return "low"

def _load_cache() -> dict:
    if not os.path.exists(CACHE_FILE):
        return {}
    try:
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def _save_cache(cache: dict):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except:
        pass

def lookup_cves_for_ports(ports: list[int]) -> list[dict]:
    """
    Main function — takes list of ports, returns CVE matches.
    Uses seed database first, then NVD API for unknown ports.
    """
    if not ports:
        return []

    cache = _load_cache()
    results = []

    for port in ports:
        port_key = str(port)

        # Check seed database first (instant)
        if port in PORT_CVE_SEED:
            for cve in PORT_CVE_SEED[port]:
                results.append({
                    "port": port,
                    "service": cve["service"],
                    "cve_id": cve["cve_id"],
                    "description": cve["description"],
                    "cvss_score": cve["cvss_score"],
                    "severity": _cvss_to_severity(cve["cvss_score"]),
                    "url": f"https://nvd.nist.gov/vuln/detail/{cve['cve_id']}"
                })
            continue

        # Check cache for unknown ports
        if port_key in cache:
            cached = cache[port_key]
            cached_time = datetime.fromisoformat(cached.get("cached_at", "2000-01-01"))
            if datetime.now() - cached_time < timedelta(hours=CACHE_TTL_HOURS):
                results.extend(cached.get("matches", []))
                continue

        # Query NVD API for unknown ports
        try:
            resp = httpx.get(
                NVD_API,
                params={"keywordSearch": f"port {port}", "resultsPerPage": 3},
                timeout=5.0
            )
            if resp.status_code == 200:
                data = resp.json()
                matches = []
                for item in data.get("vulnerabilities", []):
                    cve = item.get("cve", {})
                    cve_id = cve.get("id", "")
                    desc = cve.get("descriptions", [{}])[0].get("value", "")[:200]
                    metrics = cve.get("metrics", {})
                    cvss = 0.0
                    if "cvssMetricV31" in metrics:
                        cvss = metrics["cvssMetricV31"][0]["cvssData"]["baseScore"]
                    elif "cvssMetricV2" in metrics:
                        cvss = metrics["cvssMetricV2"][0]["cvssData"]["baseScore"]

                    if cve_id:
                        matches.append({
                            "port": port,
                            "service": f"port-{port}",
                            "cve_id": cve_id,
                            "description": desc,
                            "cvss_score": cvss,
                            "severity": _cvss_to_severity(cvss),
                            "url": f"https://nvd.nist.gov/vuln/detail/{cve_id}"
                        })

                cache[port_key] = {"cached_at": datetime.now().isoformat(), "matches": matches}
                _save_cache(cache)
                results.extend(matches)
                time.sleep(0.6)  # respect NVD rate limit

        except Exception as e:
            print(f"[CVE] NVD lookup failed for port {port}: {e}")
            continue

    # Sort by CVSS score descending — highest severity first
    results.sort(key=lambda x: x["cvss_score"], reverse=True)
    return results

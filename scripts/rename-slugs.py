#!/usr/bin/env python3
"""Rename all post slugs from pXXX to descriptive English slugs."""
import json
import os
import shutil

SLUG_MAP = {
    "p5969": "google-maps-accessibility-dining",
    "p5912": "cp-children-mobility-positioning-aids-evolution",
    "p5781": "wheelchair-children-tray-table",
    "p5717": "songshan-airport-cockpit-experience",
    "p5657": "cp-drone-flight-experience",
    "p5593": "icf-playground-accessibility-taichung",
    "p5558": "taipei-dome-wheelchair-seat-experience",
    "p5479": "moving-with-disability-part2-bathroom-ramp",
    "p5454": "moving-with-disability-part1-accessible-bathroom",
    "p5004": "your-child-can-be-tsmc-shareholder",
    "p5383": "fulong-wheelchair-ocean-trip-2023",
    "p5385": "amblyopia-eye-specialist-part2",
    "p5360": "new-assistive-device-subsidy-guide",
    "p5312": "receiving-custom-assistive-device-checklist",
    "p5274": "bathroom-safety-non-destructive-method",
    "p5257": "custom-children-assistive-devices",
    "p5249": "rainy-day-dry-feet-for-cp-kids",
    "p5192": "have-you-washed-your-wheelchair",
    "p5168": "universal-clamp-review",
    "p4998": "wheelchair-safety-hook-advocacy",
    "p5129": "lifelong-skills-for-disabled-parents",
    "p5112": "hip-joint-surgery-experience-part4",
    "p5105": "smart-energy-saving-lighting",
    "p5087": "big-kids-outdoor-shoes",
    "p5065": "diy-tv-remote-selector-for-disabled",
    "p5055": "finding-people-who-understand-you",
    "p5039": "ucat-accessible-campus-map",
    "p5033": "stair-climbing-machine-experience",
    "p5008": "zipper-shoes-for-disabled-kids",
    "p4971": "goshare-electric-scooter-sharing",
    "p4951": "cp-kids-dental-rehab-part1",
    "p4933": "being-a-life-practitioner",
    "p4919": "my-sons-pe-class",
    "p4917": "high-tone-cp-positioning-sleep-part2",
    "p4906": "universal-care-era-convenience-first",
    "p4874": "visit-assistive-device-center",
    "p4835": "delicious-braised-pork-recommendation",
    "p4864": "hip-joint-surgery-experience-part3",
    "p4858": "hip-joint-surgery-experience-part2",
    "p4853": "hip-joint-surgery-experience-part1",
    "p4795": "accessible-travel-yehliu-geopark-part2",
    "p4754": "accessible-travel-heping-island-part1",
    "p4743": "puberty-needs-for-disabled-girl",
    "p4728": "bright-smiles-in-children-assistive-devices",
    "p4706": "deep-front-line-experience",
    "p4698": "phone-typing-otg-android-solution",
    "p4678": "try-assistive-devices-easily",
    "p4672": "assistive-device-purchase-strategy",
    "p4655": "special-earphone-recommendation",
    "p4642": "atlife-2018-assistive-device-expo-prep",
    "p4617": "assistive-device-subsidy-guidebook-2018",
    "p4601": "custom-wheelchair-vs-custom-stroller",
    "p4581": "assistive-device-athome-platform",
    "p4447": "silver-assistive-device-catalog",
    "p4384": "choosing-children-assistive-devices",
    "p4367": "choosing-backpack-for-disabled-child",
    "p4335": "school-start-adjust-assistive-device-height",
    "p4300": "beitou-honey-cake-recommendation",
    "p4239": "atlife-2017-assistive-device-expo-review",
    "p4204": "custom-backrest-experience",
    "p4137": "finding-mrt-exit-for-rehab-bus",
    "p4101": "atlife-2017-taichung-expo-registration",
    "p3934": "assistive-device-athome-website",
    "p4038": "cp-child-afo-ankle-foot-orthoses",
    "p3978": "how-to-buy-right-assistive-device",
    "p3973": "assistive-device-purchase-tips",
    "p3772": "windows-font-size-settings-part2",
    "p3840": "friendly-taipei-mrt-app-2017",
    "p3798": "morinaga-candy-recommendation",
    "p3748": "alternative-rehab-bus-recommendation",
    "p3677": "assistive-device-recheck-importance",
    "p3545": "truly-give-way-to-disabled",
    "p3540": "assistive-device-catalog-recommendation",
    "p3480": "assistive-device-evaluation-center",
    "p3452": "taipei-assistive-device-center-location",
    "p3440": "open-university-lifelong-learning",
    "p3081": "hiring-foreign-caregiver-direct-part3",
    "p3314": "friendly-taipei-mrt-app-update-2016",
    "p2963": "university-subsidies-for-disabled-students",
    "p3234": "individualized-dental-care-for-disabled",
    "p2965": "university-assistive-device-lending",
    "p3167": "preschool-disability-assessment-placement",
    "p3132": "day-trip-with-disabled-friends",
    "p3099": "apple-product-shopping-tips-part2",
    "p3028": "spill-proof-cup-recommendation",
    "p3026": "stair-climbing-machine-trial-2015",
    "p2967": "kyoto-taro-japanese-restaurant",
    "p2818": "proper-assistive-device-fitting",
    "p2801": "hiring-foreign-caregiver-direct-part2",
    "p2916": "disabled-student-exam-services-2019",
    "p2843": "friendly-ambassador-internship",
    "p2759": "smart-hospital-visit-tips",
    "p2775": "hiring-foreign-caregiver-direct-part1",
    "p2694": "where-to-rent-children-assistive-devices",
    "p2690": "google-forms-easy-survey-guide",
    "p2654": "2015-medical-senior-healthcare-expo",
    "p2595": "what-is-friendly-ambassador",
    "p2563": "taipei-rehab-bus-online-booking",
    "p2530": "three-important-passbooks-in-life",
    "p2416": "post-exam-preparation-disabled-students",
    "p2467": "tianmu-sashimi-restaurant",
    "p2426": "university-exam-prep-muscle-relaxation-part3",
    "p2447": "raising-twins-part3-counseling",
    "p2374": "wheelchair-rain-poncho",
    "p2370": "diy-haircut-for-disabled-child",
    "p2107": "raising-twins-part2",
    "p2337": "friendly-hong-kong-restaurant-app",
    "p2294": "friendly-hsinchu-restaurant-app",
    "p2258": "friendly-taipei-mrt-app-part2",
    "p2220": "friendly-taipei-restaurant-app",
    "p2204": "assistive-device-resource-portal-part2",
    "p2176": "assistive-device-resource-portal-part1",
    "p2148": "line-app-time-management-shopping",
    "p2120": "disabled-student-exam-accommodations",
    "p2109": "come-learn-computers",
    "p2063": "raising-twins-part1-teacher-story",
    "p1954": "small-shopping-rewards",
    "p2029": "taipei-children-amusement-park-part3",
    "p2008": "taipei-children-amusement-park-part2",
    "p1880": "taipei-children-amusement-park-part1",
    "p1878": "enlarge-powerpoint-handout-text",
    "p1881": "disabled-student-school-placement-part2",
    "p1885": "disabled-student-school-placement-part1",
    "p1806": "assistive-device-repair-subsidy",
    "p1829": "university-exam-prep-disabled-part2",
    "p1808": "university-exam-prep-disabled-part1",
    "p1790": "cp-child-multiple-disabilities-education",
    "p1685": "special-student-service-certificate",
    "p565": "good-shoe-repair-shop",
    "p1691": "choosing-computer-aids-for-cp-child",
    "p1626": "cp-child-computer-assistive-devices",
    "p1628": "free-fire-alarm-for-disabled",
    "p1631": "disabled-student-english-listening-test",
    "p1559": "school-itinerant-therapist-services",
    "p1551": "eye-care-software-recommendation",
    "p1419": "moms-prepare-yourself-part3-employment",
    "p1421": "have-you-cleaned-your-washing-machine",
    "p1439": "add-ape-to-iep-school-life",
    "p1383": "moms-prepare-yourself-part2-certification",
    "p1358": "moms-prepare-yourself-part1",
    "p1146": "courage-to-build-a-community",
    "p1322": "eco-friendly-reusable-straws",
    "p4791": "eco-friendly-plasticizer-awareness",
    "p1305": "photo-album-for-your-child",
    "p1210": "youle-pen-story",
    "p1262": "hip-joint-dislocation-prevention",
    "p1214": "cp-24hr-positioning-sleep-part1",
    "p1231": "diy-roller-from-stockings",
    "p1147": "free-online-library-resources",
    "p721": "recommended-dictionary-for-disabled-students",
    "p1060": "on-screen-keyboard-free-downloads-part2",
    "p918": "computer-assistive-devices-for-cp-part1",
    "p983": "large-cursor-free-downloads-part1",
    "p940": "no-time-for-sadness-move-forward",
    "p885": "rimowa-luggage-rental-recommendation",
    "p852": "allergy-cough-home-remedy-for-cp-kids",
    "p563": "cp-child-swimming-hydrotherapy",
    "p468": "short-term-electric-scooter-rental",
    "p737": "tv-remote-selector-for-all-ages",
    "p707": "cp-child-writing-vs-reading",
    "p660": "amblyopia-eye-specialist-part1",
    "p567": "cp-child-standing-frame-experience",
    "p614": "great-chopsticks-for-family-part2",
    "p571": "convenient-electric-toothbrush",
    "p575": "adjustable-height-wheelchair-desk",
    "p535": "windows-font-size-settings-part1",
    "p525": "hanging-clothes-shoulder-exercise",
    "p466": "cp-child-regular-checkup-reminder",
    "p416": "portable-urinal-for-boys",
    "p401": "rotating-shower-chair-review",
    "p426": "bathroom-organization-for-disabled-part2",
    "p399": "bathroom-organization-for-disabled-part1",
    "p374": "cimt-computer-assisted-cp-research",
    "p356": "modifying-pants-for-cp-child",
    "p240": "taipei-rehab-bus-booking-tips",
    "p308": "fight-for-disability-rights",
    "p280": "heartwarming-accessible-concert",
    "p245": "world-cp-day-2013",
    "p6": "diy-ear-thermometer-calibration",
    "p16": "joystick-computer-aid-integration-part1",
    "p163": "cp-child-pilates-equipment-therapy",
    "p125": "cp-mom-try-your-luck",
    "p99": "taipei-expo-dream-pavilion-robot-2013",
    "p54": "cp-child-schooling-part1",
    "p13": "family-chopsticks-part1",
    "p14": "eye-tracking-device-trial-2010",
    "p5": "searching-for-guidance-integration",
    "p15": "on-screen-keyboard-typing-evaluation",
    "p17": "diy-bicycle-pedal-fix-for-cp",
    "p18": "diy-bookend-assistive-device",
    "p19": "diy-wheelchair-tray-book-holder",
    "p20": "cant-see-textbook-clearly-part1",
    "p21": "cant-see-textbook-clearly-part2",
    "p22": "cp-hip-joint-surgery-parent-guide",
    "p23": "low-vision-center-recommendation",
    "p24": "i-want-to-use-computer-too",
    "p7": "cp-child-dental-orthodontics",
    "p8": "junior-high-iq-test-important-for-disabled",
    "p25": "reading-aid-for-disabled",
    "p9": "junior-high-new-life-part2",
    "p10": "junior-high-new-life-part1",
    "p11": "seeking-help-and-ideas",
    "p26": "joystick-mouse-for-cp-child",
    "p27": "knowing-your-rights-and-duties",
    "p28": "encouraged-to-write-more",
    "p29": "ckc-input-method-alternative",
    "p30": "168-onscreen-keyboard-program",
    "p31": "philharmonic-radio-stories-music",
    "p32": "yunchen-168-keyboard-program",
}

def main():
    # Load data
    with open("data/posts.json") as f:
        posts = json.load(f)

    # Verify all slugs are mapped
    missing = [p["slug"] for p in posts if p["slug"] not in SLUG_MAP]
    if missing:
        print(f"ERROR: Missing slug mappings: {missing}")
        return

    # Check for duplicate new slugs
    new_slugs = list(SLUG_MAP.values())
    dupes = [s for s in new_slugs if new_slugs.count(s) > 1]
    if dupes:
        print(f"ERROR: Duplicate new slugs: {set(dupes)}")
        return

    # 1. Rename markdown files
    renamed = 0
    for old_slug, new_slug in SLUG_MAP.items():
        old_path = f"content/posts/{old_slug}.md"
        new_path = f"content/posts/{new_slug}.md"
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            renamed += 1
        else:
            print(f"WARNING: {old_path} not found")
    print(f"Renamed {renamed} markdown files")

    # 2. Update posts.json
    for p in posts:
        if p["slug"] in SLUG_MAP:
            p["slug"] = SLUG_MAP[p["slug"]]
    with open("data/posts.json", "w") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    print("Updated posts.json")

    # 3. Update feed.json
    with open("feed.json") as f:
        feed = json.load(f)
    for item in feed.get("items", []):
        old_id = item.get("id", "")
        if old_id in SLUG_MAP:
            new_slug = SLUG_MAP[old_id]
            item["id"] = new_slug
            item["url"] = f"https://cptwin.com/post.html?slug={new_slug}"
    with open("feed.json", "w") as f:
        json.dump(feed, f, ensure_ascii=False, indent=2)
    print("Updated feed.json")

    # 4. Update internal links in articles that were already rewritten
    # (the ones we changed from cptwin.com/?p=xxx to /category/pxXX/)
    internal_link_map = {
        "/life-stories/p13/": "/life-stories/family-chopsticks-part1/",
        "/parenting/p22/": "/parenting/cp-hip-joint-surgery-parent-guide/",
        "/life-stories/p401/": "/life-stories/rotating-shower-chair-review/",
        "/life-stories/p426/": "/life-stories/bathroom-organization-for-disabled-part2/",
        "/custom-mouse/p983/": "/custom-mouse/large-cursor-free-downloads-part1/",
        "/screen-keyboard/p1060/": "/screen-keyboard/on-screen-keyboard-free-downloads-part2/",
        "/life-stories/p1231/": "/life-stories/diy-roller-from-stockings/",
        "/parenting/p1631/": "/parenting/disabled-student-english-listening-test/",
    }
    updated_files = 0
    for root, dirs, files in os.walk("content/posts"):
        for fname in files:
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, "r") as f:
                content = f.read()
            original = content
            for old_link, new_link in internal_link_map.items():
                content = content.replace(old_link, new_link)
            if content != original:
                with open(fpath, "w") as f:
                    f.write(content)
                updated_files += 1
    print(f"Updated internal links in {updated_files} files")

    print("\nDone! All slugs renamed.")

if __name__ == "__main__":
    main()

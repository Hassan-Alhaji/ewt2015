# Level progression definition for Eastern Walking Team (15 Levels)

LEVELS = [
    {"level": 1, "name_ar": "مبتدئ", "name_en": "Beginner", "min_km": 0},
    {"level": 2, "name_ar": "مكتشف", "name_en": "Explorer", "min_km": 50},
    {"level": 3, "name_ar": "نشط", "name_en": "Active", "min_km": 100},
    {"level": 4, "name_ar": "ثابت", "name_en": "Consistent", "min_km": 200},
    {"level": 5, "name_ar": "مثابر", "name_en": "Persister", "min_km": 350},
    {"level": 6, "name_ar": "شغوف", "name_en": "Passionate", "min_km": 500},
    {"level": 7, "name_ar": "متميز", "name_en": "Distinguished", "min_km": 750},
    {"level": 8, "name_ar": "منضبط", "name_en": "Disciplined", "min_km": 1000},
    {"level": 9, "name_ar": "متألق", "name_en": "Brilliant", "min_km": 1300},
    {"level": 10, "name_ar": "متقدم", "name_en": "Advanced", "min_km": 1600},
    {"level": 11, "name_ar": "محترف", "name_en": "Professional", "min_km": 2000},
    {"level": 12, "name_ar": "ملهم", "name_en": "Inspirer", "min_km": 2500},
    {"level": 13, "name_ar": "قائد", "name_en": "Leader", "min_km": 3000},
    {"level": 14, "name_ar": "بطل", "name_en": "Champion", "min_km": 4000},
    {"level": 15, "name_ar": "سفير الفريق", "name_en": "Team Ambassador", "min_km": 5000},
]

def get_level_info(total_km):
    """
    Given cumulative total_km, calculates and returns progression information.
    """
    # Convert total_km to float for easy math
    km = float(total_km or 0)
    
    current_lvl = LEVELS[0]
    next_lvl = None
    
    for i in range(len(LEVELS)):
        if km >= LEVELS[i]["min_km"]:
            current_lvl = LEVELS[i]
            if i + 1 < len(LEVELS):
                next_lvl = LEVELS[i + 1]
            else:
                next_lvl = None
        else:
            break
            
    # Calculate progress percentage towards next level
    if next_lvl:
        range_min = current_lvl["min_km"]
        range_max = next_lvl["min_km"]
        if range_max > range_min:
            progress_percent = int(((km - range_min) / (range_max - range_min)) * 100)
            progress_percent = max(0, min(100, progress_percent))
        else:
            progress_percent = 0
        next_lvl_min_km = next_lvl["min_km"]
    else:
        # Max level reached
        progress_percent = 100
        next_lvl_min_km = current_lvl["min_km"]
        
    return {
        "level_number": current_lvl["level"],
        "level_name_ar": current_lvl["name_ar"],
        "level_name_en": current_lvl["name_en"],
        "current_level_min_km": current_lvl["min_km"],
        "next_level_min_km": next_lvl_min_km,
        "progress_percent": progress_percent
    }

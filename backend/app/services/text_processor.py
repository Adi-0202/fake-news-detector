import re

def normalize_raw_text(raw_text: str) ->str:
    if not raw_text:
        return ""
    try:
        cleaned_text = re.sub(r'\s+', ' ', raw_text) #Collapse duplicate whitespace characters, tabs, and unneeded breaks into unified spaces
        cleaned_text=cleaned_text.strip()
        return cleaned_text[:4000]
    except Exception as e:
        print(f"Error executing sanitation loop inside Text Service: {e}")
        raise RuntimeError(f"Internal processing failure while cleaning string inputs: {str(e)}")
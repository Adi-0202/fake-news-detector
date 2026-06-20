import easyocr
from io import BytesIO
from PIL import Image

_ocr_reader=None

def get_ocr_instance():
    global _ocr_reader
    if _ocr_reader is None:
        print("Initializing EasyOCR pipeline weights dynamically.")
        _ocr_reader=easyocr.Reader(['en'], gpu=False)
    return _ocr_reader

def extract_text_from_image(file_bytes: bytes) ->str:
    if not file_bytes:
        return ""
    try:
        image_stream=Image.open(BytesIO(file_bytes))

        # Standardize graphic formats into memory buffers to ensure byte structure consistency
        img_byte_arr=BytesIO()
        image_stream.save(img_byte_arr, format=image_stream.format if image_stream.format else 'PNG')

        reader=get_ocr_instance()

        ocr_results=reader.readtext(img_byte_arr.getvalue(), detail=0)
        return " ".join(ocr_results).strip()
    except Exception as e:
        print(f"Error executing computer vision inference inside Image Service: {e}")
        raise RuntimeError(f"Internal processing failure while running OCR layers: {str(e)}")

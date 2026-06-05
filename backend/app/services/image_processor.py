import easyocr
from io import BytesIO
from PIL import Image

ocr_reader=easyocr.Reader(['en'])

def extract_text_from_image(file_bytes: bytes) ->str:
    if not file_bytes:
        return ""
    try:
        image_stream=Image.open(BytesIO(file_bytes))

        # Standardize graphic formats into memory buffers to ensure byte structure consistency
        img_byte_arr=BytesIO()
        image_stream.save(img_byte_arr, format=image_stream.format if image_stream.format else 'PNG')

        ocr_results=ocr_reader.readtext(img_byte_arr.getvalue(), detail=0)
        return " ".join(ocr_results).strip()
    except Exception as e:
        print(f"Error executing computer vision inference inside Image Service: {e}")
        raise RuntimeError(f"Internal processing failure while running OCR layers: {str(e)}")

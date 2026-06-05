from io import BytesIO
from pypdf import PdfReader

def extract_text_from_pdf(file_bytes: bytes) -> str:
    if not file_bytes:
        return ""
    try:
        pdf_stream=BytesIO(file_bytes)
        reader=PdfReader(pdf_stream)

        extracted_pages=[]
        for page in reader.pages:
            page_text=page.extract_text()
            if page_text:
                extracted_pages.append(page_text)
            
        return "\n".join(extracted_pages).strip()
    except Exception as e:
        print(f"Error executing text extraction inside PDF Service: {e}")
        raise RuntimeError(f"Internal processing failure while parsing PDF layers: {str(e)}")

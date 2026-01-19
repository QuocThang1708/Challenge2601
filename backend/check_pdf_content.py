
try:
    from pypdf import PdfReader
    import sys
    import os

    file_path = "uploads/cv/cv-1768286932175-923162675.pdf"
    if not os.path.exists(file_path):
        # Try to find the latest pdf in uploads/cv
        files = [os.path.join("uploads/cv", f) for f in os.listdir("uploads/cv") if f.endswith(".pdf")]
        files.sort(key=os.path.getmtime, reverse=True)
        if files:
            file_path = files[0]
        else:
            print("No PDF file found")
            sys.exit(1)

    print(f"Checking file: {file_path}")
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    
    print(f"Extracted Length: {len(text)}")
    print(f"Content Snippet: {text[:500]}")

except ImportError:
    print("pypdf not installed")
except Exception as e:
    print(f"Error: {e}")

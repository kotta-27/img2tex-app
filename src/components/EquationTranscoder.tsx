import React, { useState, useCallback, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const EquationTranscoder: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const removeMarkdown = (text: string): string => {
    return text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  };

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        setImage(file);
        setText("");
        setImageURL(URL.createObjectURL(file));
      }
    },
    []
  );

  const texToSVG = (texCode: string): string => {
    return katex.renderToString(texCode, {
      displayMode: true,
    });
  };

  const downloadSVG = (svg: string) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "equation.svg");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClick = useCallback(async () => {
    if (!image) return;
    if (!geminiApiKey) {
      alert(
        "Gemini API key is missing. Please provide it in the .env.local file."
      );
      return;
    }

    setText("数式を認識中...");
    setProgress(0.1);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: "please read the equation in the image and output the LaTeX code",
                    },
                    {
                      inline_data: {
                        mime_type: image.type,
                        data: base64Image.split(",")[1],
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );
        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
          const text = removeMarkdown(data.candidates[0].content.parts[0].text);
          setText(text);
        } else if (data.error) {
          setText(`Error: ${data.error.message}`);
        } else {
          setText("数式が見つかりませんでした。");
        }
      } catch (error: any) {
        setText(`Error: ${error.message}`);
      } finally {
        setProgress(0);
      }
    };
    reader.readAsDataURL(image);
  }, [image, geminiApiKey]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setImage(file);
      setText("");
      setImageURL(URL.createObjectURL(file) ?? undefined);
    }
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData.items;
      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith("image/")
      );
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          setImage(file);
          setText("");
          setImageURL(URL.createObjectURL(file) ?? undefined);
        }
      }
    },
    []
  );

  return (
    <div onPaste={handlePaste}>
      {imageURL && (
        <div>
          <img
            src={imageURL}
            alt="Selected Image"
            style={{ maxWidth: "300px" }}
          />
        </div>
      )}
      <div onDrop={handleDrop} onDragOver={handleDragOver}>
        <input className="file-input" type="file" onChange={handleChange} />
        <button onClick={handleClick} disabled={!image}>
          数式を認識
        </button>
      </div>
      {progress > 0 && <progress value={progress} max={1} />}
      {text && (
        <div className="equation-container">
          <h3>認識された数式:</h3>
          <div>{text}</div>
          <button
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(`$$ ${text} $$`)}
          >
            コピー
          </button>
          {/* <button onClick={() => downloadSVG(texToSVG(text))}>
            SVGをダウンロード
          </button> */}
        </div>
      )}
    </div>
  );
};

export default EquationTranscoder;

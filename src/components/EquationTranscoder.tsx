import React, { useState, useCallback, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

const EquationTranscoder: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [inputText, setInputText] = useState("");
  const [progress, setProgress] = useState(0);
  const [renderedEquation, setRenderedEquation] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<React.ReactNode[] | null>(
    null
  );

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

  const renderLatex = useCallback((latex: string) => {
    try {
      setRenderedEquation(
        katex.renderToString(latex, {
          displayMode: true,
          output: "htmlAndMathml",
        })
      );
    } catch (error: any) {
      console.error("Failed to render LaTeX:", error);
      setRenderedEquation(null);
    }
  }, []);

  useEffect(() => {
    if (inputText) {
      renderLatex(inputText);
    } else {
      setRenderedEquation(null);
    }
  }, [inputText, renderLatex]);

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

  const handleClick = useCallback(async () => {
    if (!image) return;
    if (!geminiApiKey) {
      alert(
        "Gemini API key is missing. Please provide it in the .env.local file."
      );
      return;
    }

    setText("数式を認識中...");
    setRenderedEquation(null);
    setExplanation(null);
    setProgress(1);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `please read the equation in the image and output the LaTeX code. \
                      DONT'T include any other text. CANT'T include $ \
                      Please recognize vector notations as bold symbols in LaTeX. \
                      please use \bm{} to make the vector notations bold. \
                      Use the align* tag to align the equations. `,
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
        });
        const data = await response.json();
        setProgress(50);
        if (data.candidates && data.candidates.length > 0) {
          const latexText = removeMarkdown(
            data.candidates[0].content.parts[0].text
          );
          setText(latexText);
          setRenderedEquation(
            katex.renderToString(latexText, {
              displayMode: true,
              output: "html",
            })
          );
        } else if (data.error) {
          setText(
            `データエラーが発生しました。もう一度お試しください。<br>
            Error: ${data.error.message}`
          );
        } else {
          setText("数式が見つかりませんでした。");
        }
      } catch (error: any) {
        setText(
          `エラーが発生しました。もう一度お試しください。<br>
          Error: ${error.message}`
        );
      } finally {
        setProgress(100);
        // setProgress(0);
        setTimeout(function () {
          setProgress(0);
        }, 500);
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

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`$$ \n ${text} \n $$`);
    setSnackbarVisible(true); // スナックバーを表示
    setTimeout(() => setSnackbarVisible(false), 3000); // 3秒後に非表示
  }, [text]);

  const handleExplainClick = useCallback(async () => {
    if (!text) return;
    if (!geminiApiKey) {
      alert(
        "Gemini API key is missing. Please provide it in the .env.local file."
      );
      return;
    }

    setExplanation([<p key="loading">説明を生成中...</p>]);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Please explain the following LaTeX equation in Japanese: by 3-4 sentences. \
                  Please write the equations in the explanation using TeX format. ${text}`,
                },
              ],
            },
          ],
        }),
      });
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        const explanationText = removeMarkdown(
          data.candidates[0].content.parts[0].text
        );

        // Render explanation text with inline LaTeX
        const latexRegex = /(\$[\s\S]*?\$)/g; // Match $...$ for inline LaTeX
        const parts: React.ReactNode[] = [];
        let match;
        let lastIndex = 0;

        while ((match = latexRegex.exec(explanationText)) !== null) {
          // Add plain text before LaTeX block
          if (match.index > lastIndex) {
            parts.push(
              <span key={`text-${lastIndex}`}>
                {explanationText.substring(lastIndex, match.index)}
              </span>
            );
          }

          // Render LaTeX block
          const latexCode = match[0].slice(1, -1); // Remove surrounding $
          try {
            const renderedMath = katex.renderToString(latexCode, {
              displayMode: false, // Inline rendering
              output: "html",
            });
            parts.push(
              <span
                key={`latex-${match.index}`}
                dangerouslySetInnerHTML={{ __html: renderedMath }}
              />
            );
          } catch (e) {
            console.error("Error rendering LaTeX", e);
            parts.push(
              <span key={`latex-error-${match.index}`}>{match[0]}</span>
            ); // Fallback to raw LaTeX if rendering fails
          }
          lastIndex = latexRegex.lastIndex;
        }

        // Add remaining plain text
        if (lastIndex < explanationText.length) {
          parts.push(
            <span key={`text-${lastIndex}`}>
              {explanationText.substring(lastIndex)}
            </span>
          );
        }

        setExplanation(parts);
      } else if (data.error) {
        setExplanation([<span key="error">Error: {data.error.message}</span>]);
      } else {
        setExplanation([
          <span key="no-explanation">説明が見つかりませんでした。</span>,
        ]);
      }
    } catch (error: any) {
      setExplanation([<span key="error">Error: {error.message}</span>]);
    }
  }, [text, geminiApiKey]);

  return (
    <div className="equation-transcoder" onPaste={handlePaste}>
      {imageURL && (
        <div>
          <img
            src={imageURL}
            alt="Selected Image"
            style={{ maxWidth: "300px" }}
          />
        </div>
      )}
      <div
        className="file-input-container"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input className="file-input" type="file" onChange={handleChange} />
        <button
          className="execute-button"
          onClick={handleClick}
          disabled={!image}
        >
          変換
        </button>
      </div>
      {progress > 0 ? (
        <progress
          value={progress}
          max={100}
          className="progress-bar"
          style={{ opacity: 1 }}
        />
      ) : (
        <progress className="progress-bar" style={{ opacity: 0 }} />
      )}

      {(text || inputText) && (
        <div className="equation-container">
          <h3>{image ? "認識された数式:" : "入力された数式:"}</h3>
          <div
            className="rendered-equation"
            dangerouslySetInnerHTML={{ __html: renderedEquation || "" }}
          />
          <div className="equation-text">
            <div className="equation-text-label">Tex</div>
            <div
              className="equation-text-main"
              onClick={() => navigator.clipboard.writeText(text)}
              dangerouslySetInnerHTML={{ __html: text }}
            ></div>
          </div>
          <div className="button-container">
            <button className="copy-button" onClick={handleCopy}>
              Texのコードをコピー
            </button>
            <button className="explanation-button" onClick={handleExplainClick}>
              式の説明
            </button>
          </div>
          {explanation && (
            <div className="explanation-container">
              <h3>説明:</h3>
              <p className="explanation-text">{explanation}</p>
            </div>
          )}
        </div>
      )}
      {snackbarVisible && (
        <div className="snackbar">
          クリップボードにTexのコードをコピーしました！
        </div>
      )}
    </div>
  );
};

export default EquationTranscoder;

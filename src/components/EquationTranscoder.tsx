import React, { useState, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import html2canvas from "html2canvas";
import { GoogleGenAI } from "@google/genai";

const EquationTranscoder: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const [renderedEquation, setRenderedEquation] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<React.ReactNode[] | null>(
    null
  );

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [svgCopyMode, setSvgCopyMode] = useState(false); // true: コピー, false: ダウンロード
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Google GenAI SDKクライアントを初期化
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

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
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            {
              parts: [
                {
                  text: `Please read the mathematical equation in the image and output the LaTeX code. \
                    IMPORTANT INSTRUCTIONS: \
                    - DO NOT include any other text or explanations \
                    - DO NOT include $ symbols around the equation \
                    - For vector notation, carefully identify which symbols represent vectors: \
                      * Use \\mathbf{} for bold vectors (like \\mathbf{v}, \\mathbf{b}, \\mathbf{x}, \\mathbf{y}, etc.) \
                      * Use \\bm{} for bold mathematical symbols that are vectors \
                      * Pay special attention to subscripts and superscripts on vectors \
                      * Common vector symbols include: v, u, w, b, x, y, z, a, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t \
                    - Use \\mathbb{} for special number sets (like \\mathbb{R}, \\mathbb{Z}, \\mathbb{N}, \\mathbb{C}) \
                    - Use \\mathcal{} for calligraphic letters (like \\mathcal{L}, \\mathcal{M}, \\mathcal{N}) \
                    - Use align* environment for multi-line equations \
                    - Preserve all mathematical notation exactly as shown in the image`,
                },
                {
                  inlineData: {
                    mimeType: image.type,
                    data: base64Image.split(",")[1],
                  },
                },
              ],
            },
          ],
        });
        setProgress(50);
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content?.parts?.[0]?.text) {
          const latexText = removeMarkdown(
            response.candidates[0].content.parts[0].text
          );
          setText(latexText);
          setRenderedEquation(
            katex.renderToString(latexText, {
              displayMode: true,
              output: "html",
              trust: true,
              strict: false,
              throwOnError: false,
              macros: {
                "\\bm": "\\boldsymbol"
              }
            })
          );
        } else {
          setText("数式が見つかりませんでした。");
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
        setText(
          `エラーが発生しました。もう一度お試しください。<br>
          ${errorMessage}`
        );
      } finally {
        setProgress(100);
        setTimeout(function () {
          setProgress(0);
        }, 500);
      }
    };
    reader.readAsDataURL(image);
  }, [image, geminiApiKey, ai.models]);

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
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
      });
      if (response.candidates && response.candidates.length > 0 && response.candidates[0].content?.parts?.[0]?.text) {
        const explanationText = removeMarkdown(
          response.candidates[0].content.parts[0].text
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
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
            console.error("Error rendering LaTeX", errorMessage);
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
      } else {
        setExplanation([
          <span key="no-explanation">説明が見つかりませんでした。</span>,
        ]);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setExplanation([<span key="error">Error: {errorMessage}</span>]);
    }
  }, [text, geminiApiKey, ai.models]);


  // SVGダウンロード機能
  // SVGコピー/ダウンロード機能
  const handleSVGAction = useCallback(async () => {
    if (!text) {
      alert('数式が入力されていません。');
      return;
    }
    try {
      // 既存のレンダリングされた数式のHTMLを直接使用
      const renderedEquationElement = document.querySelector('.rendered-equation');
      if (!renderedEquationElement) {
        throw new Error('レンダリングされた数式要素が見つかりません');
      }

      // 既存の数式要素をクローンしてSVGに埋め込む
      const clonedElement = renderedEquationElement.cloneNode(true) as HTMLElement;
      clonedElement.style.position = 'static';
      clonedElement.style.display = 'inline-block';

      // 既存のKaTeXスタイルを取得してSVGに埋め込む
      const katexStyles = Array.from(document.styleSheets)
        .filter(styleSheet => {
          try {
            return styleSheet.href && styleSheet.href.includes('katex');
          } catch {
            return false;
          }
        })
        .map(styleSheet => {
          try {
            return Array.from(styleSheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            return '';
          }
        })
        .join('\n');

      const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="200" viewBox="0 0 800 200">
          <defs>
            <style>
              ${katexStyles}
              .katex {
                font-size: 1.21em !important;
                line-height: 1.2 !important;
                font-family: KaTeX_Main, "Times New Roman", serif !important;
                color: black !important;
              }
            </style>
          </defs>
          <foreignObject x="10" y="10" width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${clonedElement.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      if (svgCopyMode) {
        // 既存のレンダリングされた数式を直接キャプチャ
        console.log('レンダリング要素:', renderedEquationElement);
        console.log('要素の内容:', renderedEquationElement?.innerHTML);
        console.log('要素のサイズ:', (renderedEquationElement as HTMLElement)?.offsetWidth, 'x', (renderedEquationElement as HTMLElement)?.offsetHeight);

        // KaTeXの実際のコンテンツ領域を取得
        const katexElement = renderedEquationElement.querySelector('.katex-display') || renderedEquationElement.querySelector('.katex');
        const rect = katexElement ? katexElement.getBoundingClientRect() : renderedEquationElement.getBoundingClientRect();
        console.log('KaTeX要素の境界:', rect);

        // 数式の実際のコンテンツ領域だけをキャプチャ
        const targetElement = katexElement || renderedEquationElement;

        html2canvas(targetElement as HTMLElement, {
          backgroundColor: null, // 透明背景
          scale: 2, // 高品質な画像のためにスケールを上げる
          logging: true, // デバッグ情報を有効化
          useCORS: true,
          allowTaint: true,
          // 余白を削除するための設定
          x: 0,
          y: 0,
          width: Math.ceil(rect.width) || 400,
          height: Math.ceil(rect.height) || 100,
          scrollX: 0,
          scrollY: 0,
          windowWidth: Math.ceil(rect.width) || 400,
          windowHeight: Math.ceil(rect.height) || 100,
          // 余白を削除
          removeContainer: true,
          foreignObjectRendering: false,
          // キャンバスの余白を削除
          onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.querySelector('.katex-display') || clonedDoc.querySelector('.katex');
            if (clonedElement) {
              // 余白を削除するスタイルを適用
              (clonedElement as HTMLElement).style.margin = '0';
              (clonedElement as HTMLElement).style.padding = '0';
              (clonedElement as HTMLElement).style.border = 'none';
              (clonedElement as HTMLElement).style.width = 'auto';
              (clonedElement as HTMLElement).style.height = 'auto';
              // KaTeXの余白を削除
              (clonedElement as HTMLElement).style.display = 'inline-block';
            }
          }
        }).then(canvas => {
          console.log('Canvas生成成功:', canvas.width, 'x', canvas.height);
          canvas.toBlob(async (blob) => {
            if (blob) {
              console.log('Blob生成成功:', blob.size, 'bytes');
              try {
                // クリップボードAPIの互換性チェック
                if (navigator.clipboard && window.ClipboardItem) {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      'image/png': blob
                    })
                  ]);
                  console.log('クリップボードへの書き込み成功');
                  setSnackbarVisible(true);
                  setTimeout(() => setSnackbarVisible(false), 3000);
                } else {
                  // フォールバック: 画像を新しいタブで開く
                  const imageUrl = URL.createObjectURL(blob);
                  const newWindow = window.open();
                  if (newWindow) {
                    newWindow.document.write(`
                        <html>
                          <body style="margin:0; padding:20px; text-align:center;">
                            <h3>生成された数式画像</h3>
                            <img src="${imageUrl}" style="max-width:100%; border:1px solid #ccc;" />
                            <p>右クリック → 「画像をコピー」でクリップボードにコピーできます</p>
                          </body>
                        </html>
                      `);
                  }
                  alert('クリップボードAPIが利用できません。新しいタブで画像を表示しました。右クリック→「画像をコピー」でクリップボードにコピーしてください。');
                }
              } catch (err) {
                console.error('クリップボードへの書き込みに失敗:', err);
                // フォールバック: 画像をダウンロード
                const imageUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = 'equation.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(imageUrl);
                alert('クリップボードへの書き込みに失敗しました。代わりに画像をダウンロードしました。');
              }
            } else {
              console.error('Blob生成に失敗');
              alert('画像の生成に失敗しました。');
            }
          }, 'image/png');
        }).catch(error => {
          console.error('html2canvasの実行中にエラーが発生しました:', error);
          alert('画像の生成中にエラーが発生しました。');
        });
      } else {
        // ファイルとしてダウンロード
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'formula.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      console.error('SVGの生成に失敗しました:', errorMessage);
      alert('SVGの生成に失敗しました');
    }
  }, [text, svgCopyMode]);


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
          実行
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

      {text && (
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
            <div className="svg-controls">
              <label className="svg-toggle">
                <input
                  type="checkbox"
                  checked={svgCopyMode}
                  onChange={(e) => setSvgCopyMode(e.target.checked)}
                />
                <span className="toggle-label">
                  {svgCopyMode ? "クリップボードにコピー" : "ファイルとしてダウンロード"}
                </span>
              </label>
              <button className="download-button" onClick={handleSVGAction}>
                {svgCopyMode ? "画像をコピー" : "画像をダウンロード"}
              </button>
            </div>
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
          {svgCopyMode ? "クリップボードにSVGをコピーしました！" : "クリップボードにTexのコードをコピーしました！"}
        </div>
      )}
    </div>
  );
};

export default EquationTranscoder;

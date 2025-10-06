import React, { useState, useCallback, useEffect } from "react";
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
  const [imageFormat, setImageFormat] = useState<'png' | 'svg'>('png'); // 画像形式の選択
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Google GenAI SDKクライアントを初期化
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // デバッグ用のuseEffect
  useEffect(() => {
    console.log('svgCopyModeが変更されました:', svgCopyMode);
  }, [svgCopyMode]);

  useEffect(() => {
    console.log('imageFormatが変更されました:', imageFormat);
  }, [imageFormat]);

  const removeMarkdown = (text: string): string => {
    return text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");
  };

  // SVG文字列を生成する関数
  const createSvgString = (targetElement: HTMLElement, katexStyles: string, width?: number, height?: number): string => {
    const w = width || 800;
    const h = height || 200;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs>
          <style>
            ${katexStyles}
            .katex {
              font-size: 1.21em !important;
              line-height: 1.2 !important;
              font-family: KaTeX_Main, "Times New Roman", serif !important;
              color: black !important;
            }
            .katex .base {
              position: relative;
              display: inline-block;
            }
            .katex .mord {
              font-family: KaTeX_Math;
              font-style: italic;
            }
            .katex .mathbf {
              font-family: KaTeX_Main;
              font-weight: bold;
            }
            .katex .boldsymbol {
              font-family: KaTeX_Main;
              font-weight: bold;
            }
          </style>
        </defs>
        <foreignObject x="0" y="0" width="${w}" height="${h}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;padding:0;border:none;display:inline-block;">
            ${targetElement.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;
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

      // 数式の実際のサイズを取得
      const katexElement = renderedEquationElement.querySelector('.katex-display') || renderedEquationElement.querySelector('.katex');
      const rect = katexElement ? katexElement.getBoundingClientRect() : renderedEquationElement.getBoundingClientRect();
      const contentWidth = Math.ceil(rect.width);
      const contentHeight = Math.ceil(rect.height);

      const svgString = createSvgString(clonedElement, katexStyles, contentWidth, contentHeight);

      if (svgCopyMode) {
        console.log('svgCopyMode:', svgCopyMode, 'imageFormat:', imageFormat);
        console.log('imageFormat === "svg":', imageFormat === 'svg');
        if (imageFormat === 'svg') {
          console.log('SVG形式でコピーを開始');
          // SVG形式でコピー（画像として）
          try {
            // 既存のレンダリングされた数式のHTMLを直接使用
            const katexElement = renderedEquationElement.querySelector('.katex-display') || renderedEquationElement.querySelector('.katex');
            const targetElement = katexElement || renderedEquationElement;

            // 数式の実際のサイズを取得してSVGを生成
            const svgKatexElement = renderedEquationElement.querySelector('.katex-display') || renderedEquationElement.querySelector('.katex');
            const svgRect = svgKatexElement ? svgKatexElement.getBoundingClientRect() : renderedEquationElement.getBoundingClientRect();
            const svgContentWidth = Math.ceil(svgRect.width);
            const svgContentHeight = Math.ceil(svgRect.height);

            const embeddedSvgString = createSvgString(targetElement, katexStyles, svgContentWidth, svgContentHeight);

            // SVG形式でも既存の数式要素を直接キャプチャ（高品質なPNGとして）
            console.log('SVG形式でコピーを開始（高品質PNGとして）');

            // 数式の実際のコンテンツ幅を精密に計算（スタイルは保持）
            const getContentWidth = (element: HTMLElement) => {
              // より包括的なセレクタで数式内のすべての要素を取得
              const textNodes = element.querySelectorAll('span, .mord, .mrel, .mbin, .mopen, .mclose, .mpunct, .mfrac, .msup, .msub, .mfrac-num, .mfrac-den, .vlist-r, .vlist-s, .vlist-t, .mspace, .mtable, .mtr, .mtd');
              let minX = Infinity, maxX = -Infinity;
              let hasValidNodes = false;

              console.log('検出された要素数:', textNodes.length);

              textNodes.forEach((node, index) => {
                const rect = node.getBoundingClientRect();
                const textContent = node.textContent?.trim();

                // 有効なテキストコンテンツを持つ要素のみを対象
                if (rect.width > 0 && rect.height > 0 && textContent && textContent.length > 0) {
                  minX = Math.min(minX, rect.left);
                  maxX = Math.max(maxX, rect.right);
                  hasValidNodes = true;

                  if (index < 5) { // 最初の5要素をログ出力
                    console.log(`要素${index}:`, textContent, 'rect:', rect);
                  }
                }
              });

              if (!hasValidNodes) {
                console.warn('有効なテキスト要素が見つかりませんでした');
                return Math.ceil(element.getBoundingClientRect().width);
              }

              const contentWidth = Math.ceil(maxX - minX);
              console.log('計算された境界:', { minX, maxX, contentWidth });

              return contentWidth;
            };

            const svgTargetElement = svgKatexElement || renderedEquationElement;
            const contentWidth = getContentWidth(svgTargetElement as HTMLElement);
            const originalRect = svgKatexElement ? svgKatexElement.getBoundingClientRect() : renderedEquationElement.getBoundingClientRect();

            // より確実な方法：数式の実際の描画領域を取得
            const getActualContentWidth = (element: HTMLElement) => {
              // 数式の実際の描画領域を取得するため、より精密な方法を使用
              const getTextBounds = (el: HTMLElement) => {
                const range = document.createRange();
                const walker = document.createTreeWalker(
                  el,
                  NodeFilter.SHOW_TEXT,
                  null
                );

                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                let node;

                while (node = walker.nextNode()) {
                  if (node.textContent?.trim()) {
                    range.selectNode(node);
                    const rect = range.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                      minX = Math.min(minX, rect.left);
                      maxX = Math.max(maxX, rect.right);
                      minY = Math.min(minY, rect.top);
                      maxY = Math.max(maxY, rect.bottom);
                    }
                  }
                }

                return { minX, maxX, minY, maxY };
              };

              const bounds = getTextBounds(element);
              const elementRect = element.getBoundingClientRect();

              // 要素の基準点からの相対位置を計算
              const relativeMinX = bounds.minX - elementRect.left;
              const relativeMaxX = bounds.maxX - elementRect.left;
              const actualWidth = Math.ceil(relativeMaxX - relativeMinX);

              console.log('テキスト境界:', bounds);
              console.log('要素境界:', elementRect);
              console.log('相対位置:', { relativeMinX, relativeMaxX });
              console.log('実際の幅:', actualWidth);

              return actualWidth;
            };

            const actualWidth = getActualContentWidth(svgTargetElement as HTMLElement);

            console.log('元の幅:', originalRect.width);
            console.log('精密な幅:', contentWidth);
            console.log('実際の幅:', actualWidth);
            console.log('幅の差:', originalRect.width - actualWidth);

            // より精密なキャプチャのために、一時的なコンテナを作成
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '-9999px';
            tempContainer.style.width = `${actualWidth}px`;
            tempContainer.style.height = `${Math.ceil(originalRect.height)}px`;
            tempContainer.style.overflow = 'hidden';
            tempContainer.style.margin = '0';
            tempContainer.style.padding = '0';
            tempContainer.style.border = 'none';

            // 数式をクローンして一時コンテナに配置
            const clonedKatex = svgTargetElement.cloneNode(true) as HTMLElement;
            clonedKatex.style.margin = '0';
            clonedKatex.style.padding = '0';
            clonedKatex.style.border = 'none';
            clonedKatex.style.width = `${actualWidth}px`;
            clonedKatex.style.height = 'auto';
            clonedKatex.style.display = 'inline-block';
            clonedKatex.style.overflow = 'hidden';

            tempContainer.appendChild(clonedKatex);
            document.body.appendChild(tempContainer);

            html2canvas(tempContainer, {
              backgroundColor: null,
              scale: 3,
              logging: true,
              useCORS: true,
              allowTaint: true,
              x: 0,
              y: 0,
              width: actualWidth,
              height: Math.ceil(originalRect.height),
              scrollX: 0,
              scrollY: 0,
              windowWidth: actualWidth,
              windowHeight: Math.ceil(originalRect.height),
              removeContainer: false,
              foreignObjectRendering: false,
              onclone: (clonedDoc) => {
                const clonedContainer = clonedDoc.querySelector('div');
                if (clonedContainer) {
                  clonedContainer.style.margin = '0';
                  clonedContainer.style.padding = '0';
                  clonedContainer.style.border = 'none';
                  clonedContainer.style.overflow = 'hidden';
                }

                const clonedKatexInClone = clonedDoc.querySelector('.katex-display') || clonedDoc.querySelector('.katex');
                if (clonedKatexInClone) {
                  (clonedKatexInClone as HTMLElement).style.margin = '0';
                  (clonedKatexInClone as HTMLElement).style.padding = '0';
                  (clonedKatexInClone as HTMLElement).style.border = 'none';
                  (clonedKatexInClone as HTMLElement).style.width = `${actualWidth}px`;
                  (clonedKatexInClone as HTMLElement).style.height = 'auto';
                  (clonedKatexInClone as HTMLElement).style.display = 'inline-block';
                  (clonedKatexInClone as HTMLElement).style.overflow = 'hidden';
                }
              }
            }).then(canvas => {
              console.log('Canvas生成成功:', canvas.width, 'x', canvas.height);
              // 一時コンテナを削除
              if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
              }

              canvas.toBlob(async (blob) => {
                if (blob) {
                  console.log('Blob生成成功:', blob.size, 'bytes');
                  try {
                    if (navigator.clipboard && window.ClipboardItem) {
                      await navigator.clipboard.write([
                        new ClipboardItem({
                          'image/png': blob
                        })
                      ]);
                      console.log('SVG形式で高品質PNGをクリップボードにコピーしました');
                      setSnackbarVisible(true);
                      setTimeout(() => setSnackbarVisible(false), 3000);
                    } else {
                      await navigator.clipboard.writeText(embeddedSvgString);
                      console.log('SVGをテキストとしてクリップボードにコピーしました');
                      setSnackbarVisible(true);
                      setTimeout(() => setSnackbarVisible(false), 3000);
                    }
                  } catch (err) {
                    console.error('クリップボードへの書き込みに失敗:', err);
                    await navigator.clipboard.writeText(embeddedSvgString);
                    console.log('SVGをテキストとしてクリップボードにコピーしました');
                    setSnackbarVisible(true);
                    setTimeout(() => setSnackbarVisible(false), 3000);
                  }
                } else {
                  console.error('Blob生成に失敗');
                  await navigator.clipboard.writeText(embeddedSvgString);
                  console.log('SVGをテキストとしてクリップボードにコピーしました');
                  setSnackbarVisible(true);
                  setTimeout(() => setSnackbarVisible(false), 3000);
                }
              }, 'image/png');
            }).catch(error => {
              console.error('html2canvasの実行中にエラーが発生しました:', error);
              // 一時コンテナを削除
              if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
              }
              navigator.clipboard.writeText(embeddedSvgString);
              console.log('SVGをテキストとしてクリップボードにコピーしました');
              setSnackbarVisible(true);
              setTimeout(() => setSnackbarVisible(false), 3000);
            });
          } catch (err) {
            console.error('SVGのクリップボードへのコピーに失敗:', err);
            alert('SVGのクリップボードへのコピーに失敗しました。');
          }
        } else {
          console.log('PNG形式でコピーを開始');
          // PNG形式でコピー（既存のコード）
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
        }
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
  }, [text, svgCopyMode, imageFormat]);


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
                  onChange={(e) => {
                    console.log('チェックボックスがクリックされました:', e.target.checked);
                    setSvgCopyMode(e.target.checked);
                  }}
                />
                <span className="toggle-label">
                  {svgCopyMode ? "クリップボードにコピー!!! image.png" : "ファイルとしてダウンロード"}
                </span>
              </label>
              {svgCopyMode && (
                <div className="format-selector">
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    デバッグ: svgCopyMode={svgCopyMode.toString()}, imageFormat={imageFormat}
                  </div>
                  <label>
                    <input
                      type="radio"
                      name="imageFormat"
                      value="png"
                      checked={imageFormat === 'png'}
                      onChange={(e) => {
                        console.log('PNG形式が選択されました');
                        setImageFormat(e.target.value as 'png' | 'svg');
                      }}
                    />
                    PNG画像
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="imageFormat"
                      value="svg"
                      checked={imageFormat === 'svg'}
                      onChange={(e) => {
                        console.log('SVG形式が選択されました');
                        setImageFormat(e.target.value as 'png' | 'svg');
                      }}
                    />
                    SVG
                  </label>
                </div>
              )}
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

import { AlertTriangle, Download, FileImage, ImageUp, Layers3, Loader2, RefreshCw, Sparkles, LogOut, KeyRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FloorPlan } from "../shared/floorplan";
import { FloorPlanSvg } from "./components/FloorPlanSvg";
import { downloadDataUrl, downloadPng, downloadSvg } from "./lib/export";

type GeneratedImage = {
  imageUrl: string;
  mimeType: string;
  title: string;
  warnings: string[];
};

type GenerateResponse = {
  floorPlan?: FloorPlan;
  generatedImage?: GeneratedImage;
  source: "nano-banana" | "mock";
};

type ApiStatus = {
  ok: boolean;
  provider: string;
  apiVersion: string;
  model: string;
  textModel?: string;
  hasApiKey: boolean;
};

const maxFiles = 6;
const maxUploadFileBytes = 420 * 1024;
const maxUploadImageDimension = 1600;

async function optimizeUploadImage(file: File): Promise<File> {
  if (file.size <= maxUploadFileBytes) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  const initialScale = Math.min(1, maxUploadImageDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * initialScale));
  height = Math.max(1, Math.round(height * initialScale));
  let smallestBlob: Blob | null = null;

  try {
    for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("De afbeelding kon niet worden verwerkt.");
      }
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.82, 0.7, 0.58, 0.46]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        if (!blob) {
          continue;
        }
        if (!smallestBlob || blob.size < smallestBlob.size) {
          smallestBlob = blob;
        }
        if (blob.size <= maxUploadFileBytes) {
          return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
            type: "image/webp",
            lastModified: file.lastModified
          });
        }
      }

      width = Math.max(1, Math.round(width * 0.78));
      height = Math.max(1, Math.round(height * 0.78));
    }
  } finally {
    bitmap.close();
  }

  if (!smallestBlob || smallestBlob.size > maxUploadFileBytes) {
    throw new Error(`${file.name} kon niet klein genoeg worden gemaakt voor de online versie.`);
  }

  return new File([smallestBlob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified
  });
}

export default function App() {
  const [blueprint, setBlueprint] = useState<File | null>(null);
  const [styleReference, setStyleReference] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [hints, setHints] = useState("");
  const [useMock, setUseMock] = useState(false);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [source, setSource] = useState<"nano-banana" | "mock" | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const apiBase = window.location.protocol === "file:" ? "http://127.0.0.1:8787" : "";

  const [savedPassword, setSavedPassword] = useState<string>(() => {
    return localStorage.getItem("app_password") || "";
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("app_authenticated") === "true";
  });
  const [loginPasswordInput, setLoginPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetch(`${apiBase}/api/health`, {
      headers: {
        Authorization: `Bearer ${savedPassword}`
      }
    })
      .then((response) => {
        if (response.status === 401) {
          handleLogout();
          throw new Error("Sessie verlopen");
        }
        return response.json();
      })
      .then((status: ApiStatus) => {
        if (!cancelled) {
          setApiStatus(status);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiStatus(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, isAuthenticated, savedPassword]);

  function handleLogout() {
    localStorage.removeItem("app_authenticated");
    localStorage.removeItem("app_password");
    setIsAuthenticated(false);
    setSavedPassword("");
    setLoginPasswordInput("");
    setLoginError("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setIsVerifying(true);
    try {
      const response = await fetch(`${apiBase}/api/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: loginPasswordInput })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        localStorage.setItem("app_authenticated", "true");
        localStorage.setItem("app_password", loginPasswordInput);
        setSavedPassword(loginPasswordInput);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || "Ongeldig wachtwoord.");
      }
    } catch (caught) {
      setLoginError("Kon geen verbinding maken met de server.");
    } finally {
      setIsVerifying(false);
    }
  }

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file)
      })),
    [files]
  );

  const blueprintPreview = useMemo(() => (blueprint ? URL.createObjectURL(blueprint) : ""), [blueprint]);
  const styleReferencePreview = useMemo(() => (styleReference ? URL.createObjectURL(styleReference) : ""), [styleReference]);

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);
  useEffect(
    () => () => {
      if (blueprintPreview) URL.revokeObjectURL(blueprintPreview);
    },
    [blueprintPreview]
  );
  useEffect(
    () => () => {
      if (styleReferencePreview) URL.revokeObjectURL(styleReferencePreview);
    },
    [styleReferencePreview]
  );

  async function addFiles(nextFiles: FileList | File[]) {
    const incoming = Array.from(nextFiles);
    const valid = incoming.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    const accepted = valid.slice(0, Math.max(0, maxFiles - files.length));
    try {
      const optimized = await Promise.all(accepted.map(optimizeUploadImage));
      setFiles((current) => [...current, ...optimized].slice(0, maxFiles));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De afbeeldingen konden niet worden verwerkt.");
      return;
    }
    if (valid.length !== incoming.length) {
      setError("Alleen JPG, PNG en WebP-afbeeldingen zijn toegestaan.");
    } else if (accepted.length !== valid.length) {
      setError(`Je kunt maximaal ${maxFiles} restaurantfoto's toevoegen.`);
    } else {
      setError("");
    }
  }

  async function setBlueprintFile(nextFiles: FileList | File[]) {
    await setSingleImageFile(nextFiles, setBlueprint, "De plattegrondtekening moet een JPG, PNG of WebP-afbeelding zijn.");
  }

  async function setStyleReferenceFile(nextFiles: FileList | File[]) {
    await setSingleImageFile(nextFiles, setStyleReference, "Het voorbeeld eindresultaat moet een JPG, PNG of WebP-afbeelding zijn.");
  }

  async function setSingleImageFile(nextFiles: FileList | File[], setter: (file: File) => void, invalidMessage: string) {
    const [file] = Array.from(nextFiles);
    if (!file) {
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(invalidMessage);
      return;
    }
    try {
      setter(await optimizeUploadImage(file));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De afbeelding kon niet worden verwerkt.");
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="login-overlay">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <Sparkles size={26} />
            </div>
            <h1>Restaurant Plattegrond AI</h1>
            <p>Voer het wachtwoord in om toegang te krijgen.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="current-password">Wachtwoord</label>
              <div className="login-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="current-password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Voer wachtwoord in"
                  required
                  value={loginPasswordInput}
                  onChange={(e) => setLoginPasswordInput(e.target.value)}
                  disabled={isVerifying}
                />
                <button
                  type="button"
                  className="login-toggle-show"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isVerifying}
                >
                  {showPassword ? "Verberg" : "Toon"}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="login-error">
                <AlertTriangle size={18} />
                <span>{loginError}</span>
              </div>
            )}

            <button className="login-button" type="submit" disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="spin" size={20} />
                  Verifiëren...
                </>
              ) : (
                <>
                  <KeyRound size={20} />
                  Inloggen
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  async function generateFloorPlan() {
    setError("");

    if (!useMock && !blueprint) {
      setError("Upload altijd een tekening van de plattegrond. Die is nodig voor een precieze output.");
      return;
    }

    if (!useMock && files.length === 0) {
      setError("Upload minimaal één restaurantfoto naast de plattegrondtekening.");
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      if (blueprint) {
        formData.append("blueprint", blueprint);
      }
      if (styleReference) {
        formData.append("styleReference", styleReference);
      }
      files.forEach((file) => formData.append("photos", file));
      formData.append("hints", hints);
      formData.append("mock", String(useMock));

      const response = await fetch(`${apiBase}/api/generate-floorplan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${savedPassword}`
        },
        body: formData
      });
      if (response.status === 401) {
        handleLogout();
        throw new Error("Sessie verlopen. Log opnieuw in.");
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "De plattegrond kon niet worden gemaakt.");
      }

      const result = data as GenerateResponse;
      setFloorPlan(result.floorPlan ?? null);
      setGeneratedImage(result.generatedImage ?? null);
      setSource(result.source);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Er ging iets mis bij het maken van de plattegrond.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="side-panel">
          <div className="brand-block">
            <div className="brand-mark">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="eyebrow">AI plattegrondmaker</p>
              <h1>Restaurant­plattegrond</h1>
            </div>
          </div>

          <button className="primary-action top-start-action" type="button" onClick={generateFloorPlan} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="spin" size={20} /> : <Sparkles size={20} />}
            Plattegrond maken
          </button>

          <label
            className="drop-zone blueprint-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void setBlueprintFile(event.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void setBlueprintFile(event.target.files ?? [])}
            />
            <FileImage size={26} />
            <strong>Plattegrondtekening</strong>
            <span>Verplicht: JPG, PNG of WebP</span>
          </label>

          {blueprint && (
            <div className="blueprint-preview">
              <img src={blueprintPreview} alt={blueprint.name} />
              <div>
                <strong>{blueprint.name}</strong>
                <span>Wordt gebruikt als leidende bron</span>
              </div>
              <button type="button" aria-label="Plattegrondtekening verwijderen" onClick={() => setBlueprint(null)}>
                ×
              </button>
            </div>
          )}

          <label
            className="drop-zone style-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void setStyleReferenceFile(event.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void setStyleReferenceFile(event.target.files ?? [])}
            />
            <Sparkles size={24} />
            <strong>Voorbeeld eindstijl</strong>
            <span>Optioneel: renderstijl voor het eindresultaat</span>
          </label>

          {styleReference && (
            <div className="blueprint-preview style-preview">
              <img src={styleReferencePreview} alt={styleReference.name} />
              <div>
                <strong>{styleReference.name}</strong>
                <span>Wordt gebruikt voor stijl en afwerking</span>
              </div>
              <button type="button" aria-label="Voorbeeld eindstijl verwijderen" onClick={() => setStyleReference(null)}>
                ×
              </button>
            </div>
          )}

          <label
            className="drop-zone photo-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void addFiles(event.dataTransfer.files);
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => void addFiles(event.target.files ?? [])}
            />
            <ImageUp size={24} />
            <strong>Restaurantfoto’s</strong>
            <span>Aanvullend: 1-6 afbeeldingen</span>
          </label>

          {previews.length > 0 && (
            <div className="preview-grid" aria-label="Geüploade afbeeldingen">
              {previews.map(({ file, url }, index) => (
                <div className="preview-tile" key={`${file.name}-${index}`}>
                  <img src={url} alt={file.name} />
                  <button
                    type="button"
                    aria-label={`${file.name} verwijderen`}
                    onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="field">
            <span>Hints voor de AI</span>
            <textarea
              value={hints}
              onChange={(event) => setHints(event.target.value)}
              placeholder="Bijv. bar rechts, terras voorzijde, toiletten links achterin"
              rows={4}
            />
          </label>

          <div className="action-bar">
            <label className="toggle-row">
              <input type="checkbox" checked={useMock} onChange={(event) => setUseMock(event.target.checked)} />
              <span>Demo zonder API-kosten</span>
            </label>

            <div className={apiStatus?.hasApiKey ? "api-status ready" : "api-status missing"}>
              <strong>{apiStatus?.provider === "nano-banana" ? "Nano Banana" : "AI-status"}</strong>
              <span>
                {apiStatus
                  ? `${apiStatus.apiVersion} · beeld: ${apiStatus.model} · key ${apiStatus.hasApiKey ? "geladen" : "ontbreekt"}`
                  : "Serverstatus niet beschikbaar"}
              </span>
            </div>

            <button className="primary-action" type="button" onClick={generateFloorPlan} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="spin" size={20} /> : <Sparkles size={20} />}
              Plattegrond maken
            </button>

            {error && (
              <div className="notice error">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {(floorPlan || generatedImage) && (
            <div className="edit-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{source === "mock" ? "Demoresultaat" : "Nano Banana"}</p>
                  <h2>Basis exporteren</h2>
                </div>
              </div>

              <p className="muted">Schone plattegrond zonder groene tafeloverlay, klaar voor andere software.</p>

              <div className="export-row">
                <button
                  type="button"
                  onClick={() =>
                    generatedImage
                      ? downloadDataUrl(generatedImage.imageUrl, generatedImage.title, generatedImage.mimeType.includes("jpeg") ? "jpg" : "png")
                      : floorPlan && svgRef.current && downloadPng(svgRef.current, floorPlan.title)
                  }
                >
                  <Download size={17} />
                  PNG
                </button>
                <button type="button" disabled={Boolean(generatedImage)} onClick={() => floorPlan && svgRef.current && downloadSvg(svgRef.current, floorPlan.title)}>
                  <Download size={17} />
                  SVG
                </button>
              </div>
            </div>
          )}
          <button className="logout-btn" type="button" onClick={handleLogout}>
            <LogOut size={16} />
            Uitloggen
          </button>
        </aside>

        <section className="canvas-panel">
          {generatedImage || floorPlan ? (
            <>
              <div className="canvas-toolbar">
                <div>
                  <p className="eyebrow">{generatedImage ? "Gegenereerd met Nano Banana" : floorPlan?.canvas.scaleLabel}</p>
                  <h2>{generatedImage?.title ?? floorPlan?.title}</h2>
                </div>
                <div className="stats">
                  {generatedImage ? (
                    <>
                      <span>
                        <Layers3 size={16} />
                        PNG-output
                      </span>
                      <span>zonder tafeloverlay</span>
                    </>
                  ) : (
                    <>
                      <span>
                        <Layers3 size={16} />
                        {floorPlan?.areas.length ?? 0} zones
                      </span>
                      <span>{floorPlan?.fixtures.length ?? 0} vaste objecten</span>
                    </>
                  )}
                </div>
              </div>

              <div className="floorplan-stage">
                {generatedImage ? (
                  <img className="generated-floorplan" src={generatedImage.imageUrl} alt={generatedImage.title} />
                ) : floorPlan ? (
                  <FloorPlanSvg
                    ref={svgRef}
                    floorPlan={floorPlan}
                  />
                ) : null}
              </div>

              {(generatedImage?.warnings ?? floorPlan?.warnings ?? []).length > 0 && (
                <div className="warning-list">
                  {(generatedImage?.warnings ?? floorPlan?.warnings ?? []).map((warning, index) => (
                    <div key={`${warning}-${index}`}>
                      <AlertTriangle size={16} />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-visual">
                <RefreshCw size={34} />
              </div>
              <h2>Upload foto’s en maak een conceptplattegrond</h2>
              <p>
                Upload eerst een plattegrondtekening, eventueel een voorbeeld van de gewenste eindstijl, en daarna restaurantfoto’s. De output blijft schoon, zodat tafelsoftware er later overheen kan tekenen.
              </p>
            </div>
          )}
        </section>
      </section>
      <button className="floating-start-action" type="button" onClick={generateFloorPlan} disabled={isGenerating}>
        {isGenerating ? <Loader2 className="spin" size={19} /> : <Sparkles size={19} />}
        Plattegrond maken
      </button>
    </main>
  );
}

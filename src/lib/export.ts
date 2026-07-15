function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "restaurant-plattegrond";
}

export function downloadSvg(svg: SVGSVGElement, title: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), `${safeName(title)}.svg`);
}

export async function downloadPng(svg: SVGSVGElement, title: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("PNG-export kon niet worden gemaakt."));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = svg.viewBox.baseVal.width * scale;
  canvas.height = svg.viewBox.baseVal.height * scale;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("PNG-export wordt niet ondersteund in deze browser.");
  }
  context.fillStyle = "#ebe4da";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  triggerDownload(canvas.toDataURL("image/png"), `${safeName(title)}.png`);
}

export function downloadDataUrl(dataUrl: string, title: string, extension = "png") {
  triggerDownload(dataUrl, `${safeName(title)}.${extension}`);
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Props = {
  file: File;
  hint: string;
  zoomLabel: string;
  resetLabel: string;
  dark?: boolean;
  textColor?: string;
  borderColor?: string;
  primaryColor?: string;
  onCropChange: (file: File | null) => void;
};

const VIEW_SIZE = 320;
const OUTPUT_SIZE = 512;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ProfilePhotoEditor({
  file,
  hint,
  zoomLabel,
  resetLabel,
  dark,
  textColor,
  borderColor,
  primaryColor,
  onCropChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  function limits(nextZoom = zoom) {
    const image = imageRef.current;
    if (!image) return { x: 0, y: 0 };

    const baseScale = Math.max(VIEW_SIZE / image.naturalWidth, VIEW_SIZE / image.naturalHeight);
    const width = image.naturalWidth * baseScale * nextZoom;
    const height = image.naturalHeight * baseScale * nextZoom;

    return {
      x: Math.max(0, (width - VIEW_SIZE) / 2),
      y: Math.max(0, (height - VIEW_SIZE) / 2),
    };
  }

  function normalizeOffset(next: { x: number; y: number }, nextZoom = zoom) {
    const max = limits(nextZoom);
    return {
      x: clamp(next.x, -max.x, max.x),
      y: clamp(next.y, -max.y, max.y),
    };
  }

  function draw(canvas: HTMLCanvasElement, size: number) {
    const image = imageRef.current;
    if (!image) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = size;
    canvas.height = size;
    context.clearRect(0, 0, size, size);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const ratio = size / VIEW_SIZE;
    const baseScale = Math.max(VIEW_SIZE / image.naturalWidth, VIEW_SIZE / image.naturalHeight);
    const scale = baseScale * zoom * ratio;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    context.drawImage(
      image,
      size / 2 - width / 2 + offset.x * ratio,
      size / 2 - height / 2 + offset.y * ratio,
      width,
      height,
    );
  }

  useEffect(() => {
    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    setImageReady(false);
    imageRef.current = null;
    onCropChange(null);

    image.onload = () => {
      if (cancelled) return;
      imageRef.current = image;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImageReady(true);
    };
    image.onerror = () => {
      if (cancelled) return;
      imageRef.current = null;
      setImageReady(false);
      onCropChange(null);
    };
    image.src = objectUrl;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
      image.src = "";
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!imageReady || !imageRef.current) return;
    const preview = canvasRef.current;
    if (preview) draw(preview, VIEW_SIZE);

    const timer = window.setTimeout(() => {
      const output = document.createElement("canvas");
      draw(output, OUTPUT_SIZE);
      output.toBlob((blob) => {
        if (!blob) {
          onCropChange(null);
          return;
        }
        onCropChange(new File([blob], `profile-${Date.now()}.jpg`, { type: "image/jpeg" }));
      }, "image/jpeg", 0.92);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [zoom, offset, imageReady]);

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!imageReady) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: offset.x,
      startY: offset.y,
    };
    setDragging(true);
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = VIEW_SIZE / rect.width;
    setOffset(normalizeOffset({
      x: drag.startX + (event.clientX - drag.x) * ratio,
      y: drag.startY + (event.clientY - drag.y) * ratio,
    }));
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    setDragging(false);
  }

  function changeZoom(next: number) {
    setZoom(next);
    setOffset((current) => normalizeOffset(current, next));
  }

  const tc = textColor || (dark ? "#eee" : "#333");
  const bc = borderColor || (dark ? "#444" : "#E4E6EC");
  const pc = primaryColor || "#378ADD";

  return <div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      style={{
        width:"min(100%,320px)",aspectRatio:"1 / 1",margin:"0 auto",overflow:"hidden",borderRadius:"50%",
        border:"3px solid "+pc,background:dark?"#171725":"#EEF3FA",cursor:dragging?"grabbing":"grab",
        touchAction:"none",userSelect:"none",boxShadow:"0 10px 28px rgba(0,0,0,.14)",display:"flex",alignItems:"center",justifyContent:"center"
      }}
    >
      <canvas ref={canvasRef} style={{width:"100%",height:"100%",display:"block"}} />
    </div>
    <div style={{fontSize:12,lineHeight:1.45,color:dark?"#bbb":"#687386",textAlign:"center"}}>{hint}</div>
    <label style={{display:"flex",flexDirection:"column",gap:7,color:tc,fontSize:12,fontWeight:800}}>
      <span>{zoomLabel}</span>
      <input type="range" min="1" max="3" step="0.01" value={zoom} disabled={!imageReady} onChange={(event) => changeZoom(Number(event.target.value))} style={{width:"100%",accentColor:pc}} />
    </label>
    <button type="button" disabled={!imageReady} onClick={() => {setZoom(1);setOffset({x:0,y:0});}} style={{height:42,border:"1px solid "+bc,borderRadius:10,background:dark?"#2A2A3E":"#fff",color:tc,fontWeight:800,cursor:imageReady?"pointer":"not-allowed",opacity:imageReady?1:.55}}>{resetLabel}</button>
  </div>;
}

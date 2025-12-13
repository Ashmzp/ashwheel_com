import React, { useRef, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, RotateCw, Maximize2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ProfessionalCropTool = ({ imageUrl, onCropComplete, aspectRatio = null }) => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const imageObjectRef = useRef(null);
    const cropRectRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!imageUrl || !canvasRef.current) return;

        const canvasWidth = Math.min(window.innerWidth - 100, 1200);
        const canvasHeight = Math.min(window.innerHeight - 300, 800);
        
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#f5f5f5',
        });

        fabricCanvasRef.current = canvas;

        fabric.Image.fromURL(imageUrl, (img) => {
            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
            ) * 0.8;

            img.scale(scale);
            img.set({
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
                selectable: true,
                hasControls: true,
                hasBorders: true,
            });

            canvas.add(img);
            imageObjectRef.current = img;

            const cropWidth = img.getScaledWidth() * 0.8;
            const cropHeight = aspectRatio ? cropWidth / aspectRatio : img.getScaledHeight() * 0.8;

            const cropRect = new fabric.Rect({
                left: canvas.width / 2,
                top: canvas.height / 2,
                width: cropWidth,
                height: cropHeight,
                fill: 'transparent',
                stroke: '#ff0000',
                strokeWidth: 6,
                originX: 'center',
                originY: 'center',
                selectable: true,
                hasControls: true,
                lockRotation: true,
                cornerColor: '#00ff00',
                cornerSize: 15,
                borderColor: '#0000ff',
            });

            canvas.add(cropRect);
            cropRectRef.current = cropRect;
            canvas.setActiveObject(img);
            canvas.renderAll();
            setIsReady(true);
        }, { crossOrigin: 'anonymous' });

        return () => canvas.dispose();
    }, [imageUrl, aspectRatio]);

    const handleCrop = () => {
        if (!fabricCanvasRef.current || !imageObjectRef.current || !cropRectRef.current) return;

        const img = imageObjectRef.current;
        const cropRect = cropRectRef.current;

        const imgLeft = img.left - (img.getScaledWidth() / 2);
        const imgTop = img.top - (img.getScaledHeight() / 2);
        const cropLeft = cropRect.left - (cropRect.getScaledWidth() / 2);
        const cropTop = cropRect.top - (cropRect.getScaledHeight() / 2);

        const cropX = (cropLeft - imgLeft) / img.scaleX;
        const cropY = (cropTop - imgTop) / img.scaleY;
        const cropWidth = cropRect.getScaledWidth() / img.scaleX;
        const cropHeight = cropRect.getScaledHeight() / img.scaleY;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropRect.getScaledWidth();
        tempCanvas.height = cropRect.getScaledHeight();
        const ctx = tempCanvas.getContext('2d');

        ctx.drawImage(
            img.getElement(),
            cropX, cropY, cropWidth, cropHeight,
            0, 0, tempCanvas.width, tempCanvas.height
        );

        tempCanvas.toBlob((blob) => {
            const croppedUrl = URL.createObjectURL(blob);
            onCropComplete(croppedUrl, blob);
            toast({ title: 'Success!', description: 'Image cropped successfully' });
        }, 'image/png');
    };

    const handleRotate = () => {
        if (!imageObjectRef.current) return;
        const img = imageObjectRef.current;
        img.rotate((img.angle + 90) % 360);
        fabricCanvasRef.current.renderAll();
    };

    const handleFitToCanvas = () => {
        if (!imageObjectRef.current || !fabricCanvasRef.current) return;
        const canvas = fabricCanvasRef.current;
        const img = imageObjectRef.current;

        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
        img.scale(scale);
        img.set({ left: canvas.width / 2, top: canvas.height / 2, angle: 0 });
        canvas.renderAll();
    };

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                    <canvas ref={canvasRef} />
                </div>

                {isReady && (
                    <div className="flex flex-wrap gap-2 justify-center">
                        <Button onClick={handleRotate} variant="outline" size="sm">
                            <RotateCw className="w-4 h-4 mr-2" />
                            Rotate 90°
                        </Button>
                        <Button onClick={handleFitToCanvas} variant="outline" size="sm">
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Fit to Canvas
                        </Button>
                        <Button onClick={handleCrop} className="bg-blue-600 hover:bg-blue-700">
                            <Download className="w-4 h-4 mr-2" />
                            Crop & Save
                        </Button>
                    </div>
                )}

                <div className="text-sm text-gray-600 space-y-1">
                    <p>💡 <strong>How to use:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Drag the image to reposition</li>
                        <li>Use corner handles to resize image</li>
                        <li>Drag the blue crop box to adjust crop area</li>
                        <li>Resize crop box corners for custom size</li>
                    </ul>
                </div>
            </div>
        </Card>
    );
};

export default ProfessionalCropTool;

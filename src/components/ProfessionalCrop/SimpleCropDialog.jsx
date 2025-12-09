import React, { useRef, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCw, Maximize2, Loader2 } from 'lucide-react';

const SimpleCropDialog = ({ isOpen, onClose, imageUrl, onCropComplete, aspectRatio = null }) => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const imageObjectRef = useRef(null);
    const cropRectRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !imageUrl || !canvasRef.current) return;

        setIsLoading(true);

        // Clear any existing canvas
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }

        // Calculate responsive canvas size
        const maxWidth = Math.min(window.innerWidth * 0.85, 900);
        const maxHeight = Math.min(window.innerHeight * 0.6, 600);

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: maxWidth,
            height: maxHeight,
            backgroundColor: '#f5f5f5',
        });

        fabricCanvasRef.current = canvas;

        // Load image with proper error handling
        fabric.Image.fromURL(
            imageUrl,
            (img) => {
                if (!img || !img.width || !img.height) {
                    setIsLoading(false);
                    return;
                }

                const scale = Math.min(
                    (canvas.width * 0.7) / img.width,
                    (canvas.height * 0.7) / img.height
                );

                img.set({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    scaleX: scale,
                    scaleY: scale,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    borderColor: '#3b82f6',
                    cornerColor: '#3b82f6',
                    cornerSize: 8,
                    transparentCorners: false,
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
                    fill: 'rgba(59, 130, 246, 0.1)',
                    stroke: '#3b82f6',
                    strokeWidth: 3,
                    strokeDashArray: [10, 5],
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    hasControls: true,
                    lockRotation: true,
                    cornerColor: '#3b82f6',
                    cornerSize: 12,
                    transparentCorners: false,
                    borderColor: '#3b82f6',
                });

                if (aspectRatio) {
                    cropRect.setControlsVisibility({
                        mt: false,
                        mb: false,
                        ml: false,
                        mr: false,
                    });
                }

                canvas.add(cropRect);
                cropRectRef.current = cropRect;
                canvas.setActiveObject(img);
                canvas.renderAll();
                setIsLoading(false);
            },
            { crossOrigin: 'anonymous' }
        );

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [isOpen, imageUrl, aspectRatio]);

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

        const croppedUrl = tempCanvas.toDataURL('image/png');
        onCropComplete(croppedUrl);
        onClose();
    };

    const handleRotate = () => {
        if (!imageObjectRef.current) return;
        const img = imageObjectRef.current;
        img.rotate((img.angle + 90) % 360);
        fabricCanvasRef.current.renderAll();
    };

    const handleFit = () => {
        if (!imageObjectRef.current || !fabricCanvasRef.current) return;
        const canvas = fabricCanvasRef.current;
        const img = imageObjectRef.current;
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.7;
        img.scale(scale);
        img.set({ left: canvas.width / 2, top: canvas.height / 2, angle: 0 });
        canvas.renderAll();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
            <DialogContent className="max-w-4xl w-[90vw] h-auto max-h-[85vh] flex flex-col p-4 gap-2 overflow-hidden">
                <DialogHeader className="flex-shrink-0 pb-2">
                    <DialogTitle className="text-lg">Professional Crop - Free Drag & Resize</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-[400px] max-h-[calc(85vh-180px)] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 relative overflow-hidden">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg z-10">
                            <div className="text-center">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Loading image...</p>
                            </div>
                        </div>
                    )}
                    <div className="relative flex items-center justify-center w-full h-full">
                        <canvas ref={canvasRef} className="border-2 border-gray-300 rounded-lg shadow-lg" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    </div>
                </div>
                <div className="flex-shrink-0 text-center py-1">
                    <p className="text-xs font-medium text-gray-700">🖱️ Drag image • 📐 Resize corners • 🔄 Rotate</p>
                </div>
                <DialogFooter className="flex-shrink-0 flex flex-row gap-2 justify-center sm:justify-end pt-2">
                    <Button onClick={handleRotate} variant="outline" size="sm" disabled={isLoading}>
                        <RotateCw className="w-4 h-4 mr-1" /> Rotate
                    </Button>
                    <Button onClick={handleFit} variant="outline" size="sm" disabled={isLoading}>
                        <Maximize2 className="w-4 h-4 mr-1" /> Fit
                    </Button>
                    <Button onClick={onClose} variant="outline">Cancel</Button>
                    <Button onClick={handleCrop} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">Crop & Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );}
};

export default SimpleCropDialog;

import React, { useRef, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
            fabricCanvasRef.current = null;
        }

        // Calculate responsive canvas size
        const maxWidth = Math.min(window.innerWidth * 0.8, 800);
        const maxHeight = Math.min(window.innerHeight * 0.5, 500);

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: maxWidth,
            height: maxHeight,
            backgroundColor: '#f8f9fa',
        });

        fabricCanvasRef.current = canvas;

        // Load image using native Image object first, then create fabric image
        const img = new Image();
        img.onload = () => {
            try {
                const fabricImg = new fabric.Image(img);
                
                const scale = Math.min(
                    (canvas.width * 0.8) / fabricImg.width,
                    (canvas.height * 0.8) / fabricImg.height
                );

                fabricImg.set({
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

                canvas.add(fabricImg);
                imageObjectRef.current = fabricImg;

                const cropWidth = fabricImg.getScaledWidth() * 0.7;
                const cropHeight = aspectRatio ? cropWidth / aspectRatio : fabricImg.getScaledHeight() * 0.7;

                const cropRect = new fabric.Rect({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    width: cropWidth,
                    height: cropHeight,
                    fill: 'rgba(59, 130, 246, 0.1)',
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    strokeDashArray: [8, 4],
                    originX: 'center',
                    originY: 'center',
                    selectable: true,
                    hasControls: true,
                    lockRotation: true,
                    cornerColor: '#3b82f6',
                    cornerSize: 10,
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
                
                canvas.setActiveObject(fabricImg);
                canvas.renderAll();
                setIsLoading(false);
            } catch (error) {
                console.error('Error creating fabric image:', error);
                setIsLoading(false);
            }
        };
        
        img.onerror = () => {
            console.error('Error loading image');
            setIsLoading(false);
        };
        
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

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
            <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] flex flex-col p-4 gap-3">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-lg">Professional Crop - Free Drag & Resize</DialogTitle>
                    <DialogDescription>Drag, resize and crop your image</DialogDescription>
                </DialogHeader>
                <div className="flex-1 bg-gray-50 rounded-lg p-4 relative flex items-center justify-center min-h-[400px]">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
                                <p className="text-base font-medium text-gray-700">Loading image...</p>
                                <p className="text-sm text-gray-500 mt-1">Please wait while we prepare your image</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-center">
                        <canvas ref={canvasRef} className="border border-gray-300 rounded shadow-sm" />
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
    );
};

export default SimpleCropDialog;

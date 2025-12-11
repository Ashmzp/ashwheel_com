import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCw, Loader2 } from 'lucide-react';

const SimpleCropDialog = ({ isOpen, onClose, imageUrl, onCropComplete, aspectRatio = 3.5/4.5 }) => {
    const canvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [imageData, setImageData] = useState(null);
    const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 257 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!isOpen || !imageUrl) return;
        
        setIsLoading(true);
        const img = new Image();
        img.onload = () => {
            setImageData(img);
            
            // Calculate initial crop area
            const canvasWidth = 600;
            const canvasHeight = 400;
            const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.8;
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            const cropWidth = Math.min(scaledWidth * 0.7, 200);
            const cropHeight = cropWidth / aspectRatio;
            
            setCropArea({
                x: (canvasWidth - cropWidth) / 2,
                y: (canvasHeight - cropHeight) / 2,
                width: cropWidth,
                height: cropHeight
            });
            
            setIsLoading(false);
        };
        img.onerror = () => setIsLoading(false);
        img.src = imageUrl;
    }, [isOpen, imageUrl, aspectRatio]);

    useEffect(() => {
        if (!imageData || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw image
        const scale = Math.min(canvas.width / imageData.width, canvas.height / imageData.height) * 0.8;
        const scaledWidth = imageData.width * scale;
        const scaledHeight = imageData.height * scale;
        const imageX = (canvas.width - scaledWidth) / 2;
        const imageY = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(imageData, imageX, imageY, scaledWidth, scaledHeight);
        
        // Draw crop overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Clear crop area
        ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
        
        // Draw crop border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
        
        // Draw corner handles
        ctx.fillStyle = '#3b82f6';
        ctx.setLineDash([]);
        const handleSize = 8;
        const corners = [
            { x: cropArea.x - handleSize/2, y: cropArea.y - handleSize/2 },
            { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y - handleSize/2 },
            { x: cropArea.x - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 },
            { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 }
        ];
        corners.forEach(corner => {
            ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
        });
    }, [imageData, cropArea]);

    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= cropArea.x && x <= cropArea.x + cropArea.width && 
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            setIsDragging(true);
            setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setCropArea(prev => ({
            ...prev,
            x: Math.max(0, Math.min(x - dragStart.x, canvasRef.current.width - prev.width)),
            y: Math.max(0, Math.min(y - dragStart.y, canvasRef.current.height - prev.height))
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCrop = () => {
        if (!imageData || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const scale = Math.min(canvas.width / imageData.width, canvas.height / imageData.height) * 0.8;
        const scaledWidth = imageData.width * scale;
        const scaledHeight = imageData.height * scale;
        const imageX = (canvas.width - scaledWidth) / 2;
        const imageY = (canvas.height - scaledHeight) / 2;
        
        // Calculate crop coordinates on original image
        const cropX = (cropArea.x - imageX) / scale;
        const cropY = (cropArea.y - imageY) / scale;
        const cropWidth = cropArea.width / scale;
        const cropHeight = cropArea.height / scale;
        
        // Create crop canvas
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropArea.width;
        cropCanvas.height = cropArea.height;
        const cropCtx = cropCanvas.getContext('2d');
        
        cropCtx.drawImage(
            imageData,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropArea.width, cropArea.height
        );
        
        const croppedUrl = cropCanvas.toDataURL('image/png');
        onCropComplete(croppedUrl);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Crop Your Photo</DialogTitle>
                </DialogHeader>
                
                <div className="flex justify-center p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-96">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
                                <p>Loading image...</p>
                            </div>
                        </div>
                    ) : (
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={400}
                            className="border border-gray-300 rounded cursor-move"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleCrop} disabled={isLoading}>Crop & Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SimpleCropDialog;
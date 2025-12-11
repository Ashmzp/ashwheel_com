import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Cropper from 'react-easy-crop';

const CropDialog = ({
    isOpen,
    onClose,
    photo,
    crop,
    setCrop,
    zoom,
    setZoom,
    rotation,
    setRotation,
    onCropComplete,
    onFinishCropping,
    aspect,
    initialCrop
}) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [imageLoading, setImageLoading] = useState(false);

    useEffect(() => {
        if (!photo?.source) {
            setImageSrc(null);
            return;
        }

        setImageLoading(true);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setImageSrc(photo.source);
            setImageLoading(false);
        };
        img.onerror = () => {
            setImageSrc(photo.source); // fallback
            setImageLoading(false);
        };
        img.src = photo.source;
    }, [photo]);

    const handleClose = () => {
        setImageSrc(null);
        setImageLoading(false);
        onClose();
    };

    if (!isOpen || !photo) return null;

    if (imageLoading || !imageSrc) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col p-4">
                    <DialogHeader>
                        <DialogTitle>Crop Your Photo</DialogTitle>
                        <DialogDescription>Loading image...</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                        <Loader2 className="animate-spin h-10 w-10 text-primary" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col p-4">
                <DialogHeader>
                    <DialogTitle>Crop Your Photo</DialogTitle>
                    <DialogDescription>Adjust zoom, rotation and crop area</DialogDescription>
                </DialogHeader>
                <div className="relative flex-1 my-4 bg-muted rounded-md min-h-[60vh]">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        showGrid={true}
                        cropShape="rect"
                        objectFit="contain"
                        initialCroppedAreaPixels={initialCrop}
                        style={{ 
                            containerStyle: { 
                                height: '100%', 
                                width: '100%',
                                position: 'relative'
                            } 
                        }}
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm font-medium">Zoom: {zoom.toFixed(1)}x</Label>
                        <Slider value={[zoom]} min={1} max={10} step={0.1} onValueChange={(val) => setZoom(val[0])} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Rotation: {rotation}°</Label>
                        <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={(val) => setRotation(val[0])} className="mt-1" />
                    </div>
                </div>
                <DialogFooter className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button onClick={onFinishCropping} className="bg-blue-600 hover:bg-blue-700">Crop & Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CropDialog;
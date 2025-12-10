import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
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
    if (!isOpen || !photo) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="crop-dialog-content flex flex-col p-3 sm:p-4">
                <DialogHeader>
                    <DialogTitle>Crop Your Photo</DialogTitle>
                    <DialogDescription>Adjust zoom, rotation and crop area</DialogDescription>
                </DialogHeader>
                <div className="relative flex-1 my-3 bg-muted rounded-md min-h-[450px] max-h-[calc(90vh-250px)]">
                    <Cropper
                        image={photo.source}
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
                <div className="flex flex-col gap-3">
                    <div>
                        <Label className="text-sm font-medium">Zoom: {zoom.toFixed(1)}x</Label>
                        <Slider value={[zoom]} min={1} max={10} step={0.1} onValueChange={(val) => setZoom(val[0])} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Rotation: {rotation}°</Label>
                        <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={(val) => setRotation(val[0])} className="mt-1" />
                    </div>
                </div>
                <DialogFooter className="mt-3 flex gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={onFinishCropping} className="bg-blue-600 hover:bg-blue-700">Crop & Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CropDialog;
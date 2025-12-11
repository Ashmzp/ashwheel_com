import React, { useRef, useEffect, useState } from 'react';
import SEO from '@/components/SEO';
import { fabric } from 'fabric';
import { useDropzone } from 'react-dropzone';
import { getDocument } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Download, Trash2, BringToFront, SendToBack, RotateCw, ZoomIn, ZoomOut, Crop, Layers } from 'lucide-react';
import ToolWrapper from '@/components/ToolWrapper';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ProfessionalImageCropper from '@/components/common/ProfessionalImageCropper';

const pageSizes = {
    'A4': { width: 210, height: 297 }, // mm
    'A3': { width: 297, height: 420 },
    'Letter': { width: 215.9, height: 279.4 },
    'Custom': { width: 210, height: 297 }
};
const DPI = 96; // Assume screen DPI
const MM_TO_PX = DPI / 25.4;

const CanvasCraftPage = () => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState('A4');
    const [customSize, setCustomSize] = useState({ width: 210, height: 297 });
    const { toast } = useToast();

    const [isCropping, setIsCropping] = useState(false);
    const [croppingImage, setCroppingImage] = useState(null);

    useEffect(() => {
        const size = pageSizes[canvasSize] || customSize;
        const width = (canvasSize === 'Custom' ? customSize.width : size.width) * MM_TO_PX;
        const height = (canvasSize === 'Custom' ? customSize.height : size.height) * MM_TO_PX;

        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }

        fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
            width: width,
            height: height,
            backgroundColor: 'white',
            selection: true,
        });

        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [canvasSize, customSize]);

    const onDrop = (acceptedFiles) => {
        if (!fabricCanvasRef.current) return;
        acceptedFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                if (file.type.startsWith('image/')) {
                    fabric.Image.fromURL(reader.result, (img) => {
                        img.scaleToWidth(fabricCanvasRef.current.width / 4);
                        fabricCanvasRef.current.add(img);
                        fabricCanvasRef.current.centerObject(img);
                        fabricCanvasRef.current.renderAll();
                    });
                } else if (file.type === 'application/pdf') {
                    renderPdfToCanvas(reader.result);
                } else {
                    toast({ title: "Unsupported File", description: `File type ${file.type} is not supported.`, variant: "destructive" });
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const renderPdfToCanvas = async (dataUrl) => {
        if (!fabricCanvasRef.current) return;
        try {
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.min.js',
                import.meta.url,
            ).toString();
            const loadingTask = getDocument(dataUrl);
            const pdf = await loadingTask.promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                fabric.Image.fromURL(canvas.toDataURL(), (img) => {
                    img.scaleToWidth(fabricCanvasRef.current.width / 2);
                    fabricCanvasRef.current.add(img);
                    fabricCanvasRef.current.centerObject(img);
                    fabricCanvasRef.current.renderAll();
                });
            }
        } catch (error) {
            toast({ title: "PDF Error", description: "Could not render PDF file.", variant: "destructive" });
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true, accept: { 'image/*': [], 'application/pdf': [] } });

    const getActiveObject = () => fabricCanvasRef.current?.getActiveObject();

    const deleteSelected = () => {
        if (!fabricCanvasRef.current) return;
        const activeObjects = fabricCanvasRef.current.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach(obj => fabricCanvasRef.current.remove(obj));
            fabricCanvasRef.current.discardActiveObject().renderAll();
        }
    };

    const bringToFront = () => getActiveObject()?.bringToFront() && fabricCanvasRef.current.renderAll();
    const sendToBack = () => getActiveObject()?.sendToBack() && fabricCanvasRef.current.renderAll();
    const rotateSelected = () => {
        const activeObject = getActiveObject();
        if (activeObject) {
            activeObject.rotate((activeObject.angle + 90) % 360);
            fabricCanvasRef.current.renderAll();
        }
    };

    const zoomCanvas = (factor) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.setZoom(canvas.getZoom() * factor);
        canvas.renderAll();
    };

    const exportAs = (format) => {
        if (!fabricCanvasRef.current) return;
        const dataURL = fabricCanvasRef.current.toDataURL({ format: format === 'jpeg' ? 'jpeg' : 'png', quality: 1.0 });
        if (format === 'jpeg' || format === 'png') {
            const link = document.createElement('a');
            link.download = `canvas-craft.${format}`;
            link.href = dataURL;
            link.click();
        } else if (format === 'pdf') {
            const size = pageSizes[canvasSize] || customSize;
            const pdf = new jsPDF({
                orientation: size.width > size.height ? 'l' : 'p',
                unit: 'mm',
                format: [size.width, size.height]
            });
            pdf.addImage(dataURL, 'JPEG', 0, 0, size.width, size.height);
            pdf.save('canvas-craft.pdf');
        }
    };

    const handleCustomSizeChange = (e, dimension) => {
        setCustomSize(prev => ({ ...prev, [dimension]: Number(e.target.value) }));
    };

    const startCrop = () => {
        const activeObject = getActiveObject();
        if (activeObject && activeObject.type === 'image') {
            setCroppingImage(activeObject.getSrc());
            setIsCropping(true);
        } else {
            toast({ title: "No Image Selected", description: "Please select an image to crop." });
        }
    };

    const handleCropSave = (croppedDataUrl) => {
        const activeObject = getActiveObject();
        if (activeObject) {
            activeObject.setSrc(croppedDataUrl, () => {
                fabricCanvasRef.current.renderAll();
            });
        }
        setIsCropping(false);
        setCroppingImage(null);
    };

    const howToUse = (
        <div className="space-y-4 text-sm text-muted-foreground">
            <p><strong>1. Set Canvas Size:</strong> Choose a preset size (A4, A3, etc.) or select 'Custom' and enter your desired dimensions in millimeters.</p>
            <p><strong>2. Upload Files:</strong> Drag and drop images (JPEG, PNG) or PDF files onto the canvas, or click the 'Upload' button to select them.</p>
            <p><strong>3. Edit Objects:</strong> Click on an object to select it. You can then drag to move, use the corner handles to resize, and the top handle to rotate.</p>
            <p><strong>4. Use the Toolbar:</strong> The toolbar provides options to bring objects to the front, send them to the back, rotate by 90 degrees, or delete them.</p>
            <p><strong>5. Zoom:</strong> Use the zoom buttons to get a closer look or see the whole canvas.</p>
            <p><strong>6. Export:</strong> When your design is ready, click 'Download' and choose your desired format (JPEG, PNG, or PDF).</p>
        </div>
    );

    const faqSchema = {
        "@type": "FAQPage",
        "mainEntity": [
            { "@type": "Question", "name": "What can I create with CanvasCraft?", "acceptedAnswer": { "@type": "Answer", "text": "Create custom layouts by combining images and PDF pages on a canvas. Perfect for collages, presentations, and print materials." } },
            { "@type": "Question", "name": "What file formats are supported?", "acceptedAnswer": { "@type": "Answer", "text": "You can upload JPEG, PNG images and PDF files. Export as JPEG or PDF." } },
            { "@type": "Question", "name": "Can I customize canvas size?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, choose from presets (A4, A3, Letter) or enter custom dimensions in millimeters." } }
        ]
    };

    return (
        <>
            <SEO path="/tools/canvas-craft" faqSchema={faqSchema} />
            <ToolWrapper
                title="CanvasCraft"
                subtitle="Your Creative Space for Photo & PDF Layouts"
                icon={<Layers className="w-12 h-12" />}
                howToUse={howToUse}
            >
                <div className="flex flex-col lg:flex-row gap-4 h-full">
                    <Card className="w-full lg:w-64 flex-shrink-0">
                        <CardContent className="p-4 space-y-4">
                            <Button onClick={() => document.getElementById('file-input-canvascraft').click()} className="w-full">
                                <Upload className="mr-2 h-4 w-4" /> Upload Files
                                <input {...getInputProps()} id="file-input-canvascraft" name="file-input-canvascraft" />
                            </Button>
                            <div className="space-y-2">
                                <Label htmlFor="canvas-size-select">Canvas Size</Label>
                                <Select id="canvas-size-select" name="canvas-size-select" value={canvasSize} onValueChange={setCanvasSize}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(pageSizes).map(size => <SelectItem key={size} value={size}>{size}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {canvasSize === 'Custom' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input type="number" name="custom-width" id="custom-width" placeholder="W (mm)" value={customSize.width} onChange={(e) => handleCustomSizeChange(e, 'width')} />
                                        <Input type="number" name="custom-height" id="custom-height" placeholder="H (mm)" value={customSize.height} onChange={(e) => handleCustomSizeChange(e, 'height')} />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Object Controls</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" onClick={bringToFront}><BringToFront className="mr-2 h-4 w-4" /> Front</Button>
                                    <Button variant="outline" onClick={sendToBack}><SendToBack className="mr-2 h-4 w-4" /> Back</Button>
                                    <Button variant="outline" onClick={rotateSelected}><RotateCw className="mr-2 h-4 w-4" /> Rotate</Button>
                                    <Button variant="outline" onClick={startCrop}><Crop className="mr-2 h-4 w-4" /> Crop</Button>
                                    <Button variant="destructive" onClick={deleteSelected} className="col-span-2"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Canvas Controls</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" onClick={() => zoomCanvas(1.1)}><ZoomIn className="mr-2 h-4 w-4" /> Zoom In</Button>
                                    <Button variant="outline" onClick={() => zoomCanvas(0.9)}><ZoomOut className="mr-2 h-4 w-4" /> Zoom Out</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Export</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button onClick={() => exportAs('jpeg')}><Download className="mr-2 h-4 w-4" /> JPEG</Button>
                                    <Button onClick={() => exportAs('pdf')}><Download className="mr-2 h-4 w-4" /> PDF</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex-grow bg-muted rounded-lg p-4 overflow-auto flex items-center justify-center">
                        <div {...getRootProps({ className: `w-full h-full flex items-center justify-center ${isDragActive ? 'border-2 border-dashed border-primary' : ''}` })}>
                            <canvas ref={canvasRef} className="shadow-lg" />
                        </div>
                    </div>
                </div>
                <Dialog open={isCropping} onOpenChange={setIsCropping}>
                    <DialogContent className="max-w-none w-[98vw] h-[95vh] !top-[2vh] !translate-y-0 p-0 overflow-hidden flex flex-col bg-background border-none gap-0">
                        {croppingImage && (
                            <ProfessionalImageCropper
                                imageSrc={croppingImage}
                                onCancel={() => setIsCropping(false)}
                                onSave={handleCropSave}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </ToolWrapper>
        </>
    );
};

export default CanvasCraftPage;
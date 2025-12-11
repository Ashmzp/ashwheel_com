import React, { useState, useRef, useCallback } from 'react';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, Loader2, ArrowLeft, RefreshCw, Scissors, HelpCircle, FileText, Move, CheckCircle2 } from 'lucide-react';
import ProfessionalImageCropper from '@/components/common/ProfessionalImageCropper';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
).toString();

const DraggableCroppedImage = ({ id, src, x, y, onDragEnd }) => {
    const [image] = useImage(src, 'anonymous');
    return (
        <KonvaImage
            id={id}
            image={image}
            x={x}
            y={y}
            draggable
            onDragEnd={(e) => {
                onDragEnd(id, e.target.x(), e.target.y());
            }}
        />
    );
};

const A4_WIDTH_PX = 595;
const A4_HEIGHT_PX = 842;

const CropAnythingPage = () => {
    const [step, setStep] = useState('upload'); // upload, crop, arrange, download
    const [files, setFiles] = useState([]);
    const [currentCroppingFileId, setCurrentCroppingFileId] = useState(null);
    const [arrangedImages, setArrangedImages] = useState([]);
    const [finalPdfUrl, setFinalPdfUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fileInputRef = useRef(null);
    const stageRef = useRef(null);
    const { toast } = useToast();

    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setIsProcessing(true);
        setFiles([]);

        const newFilesPromises = selectedFiles.map(file => {
            return new Promise(async (resolve) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            resolve({ id: uuidv4(), source: event.target.result, type: 'image', cropped: null, name: file.name });
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                } else if (file.type === 'application/pdf') {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        const pagePromises = [];
                        for (let i = 1; i <= pdf.numPages; i++) {
                            pagePromises.push(
                                pdf.getPage(i).then(page => {
                                    const viewport = page.getViewport({ scale: 2.0 });
                                    const canvas = document.createElement('canvas');
                                    const context = canvas.getContext('2d');
                                    canvas.width = viewport.width;
                                    canvas.height = viewport.height;
                                    return page.render({ canvasContext: context, viewport }).promise.then(() => {
                                        return { id: uuidv4(), source: canvas.toDataURL('image/png'), type: 'pdf-page', cropped: null, name: `${file.name} (Page ${i})` };
                                    });
                                })
                            );
                        }
                        resolve(Promise.all(pagePromises));
                    } catch (error) {
                        toast({ title: 'PDF Error', description: `Could not load ${file.name}.`, variant: 'destructive' });
                        resolve([]);
                    }
                } else {
                    resolve(null);
                }
            });
        });

        const results = await Promise.all(newFilesPromises);
        const flattenedResults = results.flat().filter(Boolean);

        setFiles(flattenedResults);
        setIsProcessing(false);
        if (flattenedResults.length > 0) {
            setStep('crop');
        }
    };

    const startCropping = (fileId) => {
        setCurrentCroppingFileId(fileId);
    };

    const handleCropSave = (croppedDataUrl) => {
        if (!currentCroppingFileId) return;
        setFiles(files.map(f => f.id === currentCroppingFileId ? { ...f, cropped: croppedDataUrl } : f));
        setCurrentCroppingFileId(null);
    };

    const handleGoToArrange = () => {
        const croppedFiles = files.filter(f => f.cropped);
        if (croppedFiles.length === 0) {
            toast({ title: 'No Cropped Images', description: 'Please crop at least one image before proceeding.', variant: 'destructive' });
            return;
        }
        setArrangedImages(croppedFiles.map((file, index) => ({
            ...file,
            x: 10,
            y: 10 + index * 10,
        })));
        setStep('arrange');
    };

    const handleDragEnd = (id, x, y) => {
        setArrangedImages(prev => prev.map(img => img.id === id ? { ...img, x, y } : img));
    };

    const generateFinalPdf = async () => {
        if (!stageRef.current) return;
        setIsProcessing(true);
        try {
            const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([A4_WIDTH_PX, A4_HEIGHT_PX]);
            const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
            const image = await pdfDoc.embedPng(imageBytes);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: A4_WIDTH_PX,
                height: A4_HEIGHT_PX,
            });

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            setFinalPdfUrl(URL.createObjectURL(blob));
            setStep('download');
        } catch (error) {
            toast({ title: 'PDF Generation Failed', description: 'Could not create the final PDF.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    const resetState = () => {
        setStep('upload');
        setFiles([]);
        setArrangedImages([]);
        setCurrentCroppingFileId(null);
        setFinalPdfUrl(null);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const currentFileToCrop = files.find(f => f.id === currentCroppingFileId);

    const faqSchema = {
        "@type": "FAQPage",
        "mainEntity": [
            { "@type": "Question", "name": "Can I crop PDF pages?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, upload a PDF and each page will be extracted as an image that you can crop individually." } },
            { "@type": "Question", "name": "How many images can I crop at once?", "acceptedAnswer": { "@type": "Answer", "text": "You can upload and crop multiple images or PDF pages in a single session, then arrange them all on one A4 sheet." } },
            { "@type": "Question", "name": "What's the output format?", "acceptedAnswer": { "@type": "Answer", "text": "The final output is a PDF file with all your cropped images arranged on an A4-sized page." } }
        ]
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <SEO path="/tools/crop-anything" faqSchema={faqSchema} />
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4 sm:p-6">
                <header className="flex items-center justify-between mb-8">
                    <Button variant="ghost" asChild>
                        <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools</Link>
                    </Button>
                    <h1 className="text-xl sm:text-2xl font-bold text-primary text-center">Crop Anything Tool</h1>
                    <Button onClick={resetState} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Start Over</Button>
                </header>

                <main className="flex-1 flex flex-col items-center">
                    <Card className="w-full max-w-6xl">
                        <CardHeader>
                            <CardTitle>Multi-File Cropper & A4 Sheet Generator</CardTitle>
                            <CardDescription>Upload images or PDFs, crop them, arrange on an A4 sheet, and download.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AnimatePresence mode="wait">
                                {step === 'upload' && (
                                    <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent transition-colors">
                                            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                                            <p className="text-lg text-muted-foreground text-center px-4">Click to upload Images or Multi-Page PDFs</p>
                                            <input type="file" id="crop-anything-upload" name="crop-anything-upload" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" multiple className="hidden" />
                                        </div>
                                        {isProcessing && <div className="flex justify-center mt-4"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}
                                    </motion.div>
                                )}

                                {step === 'crop' && (
                                    <motion.div key="crop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <h3 className="text-lg font-semibold mb-4">Step 1: Crop Your Images</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                                            {files.map(file => (
                                                <div key={file.id} className="relative group aspect-w-1 aspect-h-1">
                                                    <img src={file.cropped || file.source} alt={file.name} className="w-full h-full object-cover rounded-md border" />
                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => startCropping(file.id)}><Scissors className="h-4 w-4 mr-1" /> Crop</Button>
                                                    </div>
                                                    {file.cropped && <CheckCircle2 className="absolute top-1 right-1 h-5 w-5 text-green-500 bg-white rounded-full" />}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-center">
                                            <Button onClick={handleGoToArrange} disabled={files.every(f => !f.cropped)}>
                                                <Move className="mr-2 h-4 w-4" /> Proceed to Arrange
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 'arrange' && (
                                    <motion.div key="arrange" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <h3 className="text-lg font-semibold mb-4">Step 2: Arrange on A4 Sheet</h3>
                                        <p className="text-sm text-muted-foreground mb-4">Drag and drop the images to position them on the canvas.</p>
                                        <div className="mx-auto border-2 border-dashed" style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX }}>
                                            <Stage width={A4_WIDTH_PX} height={A4_HEIGHT_PX} ref={stageRef} className="bg-white">
                                                <Layer>
                                                    {arrangedImages.map(img => (
                                                        <DraggableCroppedImage key={img.id} id={img.id} src={img.cropped} x={img.x} y={img.y} onDragEnd={handleDragEnd} />
                                                    ))}
                                                </Layer>
                                            </Stage>
                                        </div>
                                        <div className="text-center mt-6">
                                            <Button onClick={generateFinalPdf} disabled={isProcessing}>
                                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                                Generate Final PDF
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 'download' && (
                                    <motion.div key="download" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <h3 className="text-lg font-semibold text-center mb-4">Step 3: Download Your PDF</h3>
                                        <div className="mb-6 border rounded-lg overflow-hidden bg-gray-100 p-4 mx-auto flex items-center justify-center">
                                            <iframe src={finalPdfUrl} className="w-full h-[60vh]" title="Final PDF Preview"></iframe>
                                        </div>
                                        <div className="flex justify-center">
                                            <Button asChild size="lg">
                                                <a href={finalPdfUrl} download="ashwheel-cropped-sheet.pdf"><Download className="mr-2 h-4 w-4" /> Download PDF</a>
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                    <Card className="w-full max-w-6xl mt-8">
                        <CardHeader>
                            <CardTitle>How to Use the Crop Anything Tool</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                            <p>This powerful tool lets you crop multiple images or even pages from a PDF and arrange them perfectly on a single A4 sheet.</p>
                            <ol>
                                <li><strong>Upload Your Files:</strong> Click the upload area to select one or more image files (like JPG, PNG) or multi-page PDF documents. The tool will automatically extract each PDF page as a separate image.</li>
                                <li><strong>Crop Each Image:</strong> Hover over any image and click the "Crop" button. A dialog will appear where you can zoom, rotate, and select the exact area you want to keep. Click "Crop & Save" when you're done. A green checkmark will appear on cropped images.</li>
                                <li><strong>Arrange on A4 Sheet:</strong> Once you've cropped at least one image, click "Proceed to Arrange". You'll see an A4 canvas where you can drag and drop your cropped images to place them exactly where you want.</li>
                                <li><strong>Generate and Download:</strong> When you're happy with the layout, click "Generate Final PDF". You'll see a preview of the final document, which you can then download with a single click.</li>
                            </ol>
                        </CardContent>
                    </Card>
                </main>
            </div>

            <Dialog open={!!currentFileToCrop} onOpenChange={(isOpen) => !isOpen && setCurrentCroppingFileId(null)}>
                <DialogContent className="max-w-none w-[98vw] h-[95vh] !top-[2vh] !translate-y-0 p-0 gap-0 overflow-hidden flex flex-col bg-background border-none">
                    {currentFileToCrop && (
                        <ProfessionalImageCropper
                            imageSrc={currentFileToCrop.source}
                            onCancel={() => setCurrentCroppingFileId(null)}
                            onSave={handleCropSave}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </DndProvider>
    );
};

export default CropAnythingPage;
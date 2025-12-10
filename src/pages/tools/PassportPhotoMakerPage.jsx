import React, { useState, useRef, useCallback } from 'react';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdf-lib';
import { AnimatePresence, motion } from 'framer-motion';
import { saveAs } from 'file-saver';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, HelpCircle } from 'lucide-react';

import SimpleCropDialog from '@/components/ProfessionalCrop/SimpleCropDialog';
import SetupView from '@/components/PassportPhotoMaker/SetupView';
import ResultView from '@/components/PassportPhotoMaker/ResultView';

const HowToUse = () => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6"
    >
        <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <HelpCircle className="mr-2 h-5 w-5" />
            How to Use Passport Photo Maker
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>**Upload Photos:** Click 'Add Photo' to upload one or more images.</li>
            <li>**Crop Each Photo:** Click the 'Crop' button on each photo to adjust it to the correct passport size aspect ratio.</li>
            <li>**Set Copies:** Choose how many copies you want for each uploaded photo.</li>
            <li>**Generate Sheet:** Click 'Generate Photo Sheet' to see a preview.</li>
            <li>**Arrange & Download:** Drag the photos on the A4 sheet to arrange them. Finally, download the sheet as a JPEG or PDF.</li>
        </ol>
    </motion.div>
);

const PassportPhotoMakerPage = () => {
  const [photos, setPhotos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultState, setResultState] = useState(null);
  const [sheetDataUrl, setSheetDataUrl] = useState(null);
  const [numberOfCopies, setNumberOfCopies] = useState(8);
  const [imagePositions, setImagePositions] = useState({});
  
  const [currentCroppingPhoto, setCurrentCroppingPhoto] = useState(null);

  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const aspect = 3.5 / 4.5;

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0 && files.length > 0) {
        toast({ title: 'Invalid File Type', description: 'Please select valid image files (JPEG, PNG).', variant: 'destructive' });
        return;
    }

    imageFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const newPhoto = { id: uuidv4(), source: event.target.result, cropped: null, width: img.width, height: img.height };
                setPhotos(prev => [...prev, newPhoto]);
                if (!currentCroppingPhoto && imageFiles.indexOf(file) === 0) {
                    startCropping(newPhoto);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
    
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const startCropping = (photo) => {
    setCurrentCroppingPhoto(photo);
  };

  const handleCropComplete = (croppedUrl) => {
    setPhotos(prevPhotos => prevPhotos.map(p => p.id === currentCroppingPhoto.id ? { ...p, cropped: croppedUrl } : p));
    setCurrentCroppingPhoto(null);
  };

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const generatePhotoSheet = () => {
    const croppedPhotos = photos.filter(p => p.cropped);
    if (croppedPhotos.length === 0) {
      toast({ title: 'No Cropped Photos', description: 'Please upload and crop at least one photo.', variant: 'destructive' });
      return;
    }
    
    const dpi = 300;
    const a4WidthPx = Math.floor(8.27 * dpi);
    const a4HeightPx = Math.floor(11.69 * dpi);
    const photoWidthCm = 3.5;
    const photoHeightCm = 4.5;
    const photoWidthPx = Math.floor(photoWidthCm / 2.54 * dpi);
    const photoHeightPx = Math.floor(photoHeightCm / 2.54 * dpi);
    const margin = 10;
    const cols = Math.floor(a4WidthPx / (photoWidthPx + margin));
    const rows = Math.floor(a4HeightPx / (photoHeightPx + margin));
    const horizontalMargin = (a4WidthPx - (cols * (photoWidthPx + margin)) + margin) / 2;
    const verticalMargin = (a4HeightPx - (rows * (photoHeightPx + margin)) + margin) / 2;

    const positions = {};
    let photoIndex = 0;

    for (const photo of croppedPhotos) {
        for (let i = 0; i < numberOfCopies; i++) {
            const uniqueId = `${photo.id}-${i}`;
            const r = Math.floor(photoIndex / cols);
            const c = photoIndex % cols;
            if (r >= rows) break;
            const x = horizontalMargin + c * (photoWidthPx + margin);
            const y = verticalMargin + r * (photoHeightPx + margin);
            positions[uniqueId] = { x, y, src: photo.cropped, width: photoWidthPx, height: photoHeightPx };
            photoIndex++;
        }
    }
    setImagePositions(positions);
    setResultState('generating');
  };

  const downloadAs = async (format) => {
    if (!sheetDataUrl) return;
    setIsProcessing(true);
    try {
        if (format === 'jpeg') {
            saveAs(sheetDataUrl, 'passport-photos.jpeg');
        } else if (format === 'pdf') {
            const pdfDoc = await PDFDocument.create();
            const jpegImage = await pdfDoc.embedJpg(sheetDataUrl);
            const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
            page.drawImage(jpegImage, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            saveAs(blob, 'passport-photos.pdf');
        }
    } catch (error) {
       toast({ title: 'Download Failed', description: `Could not prepare the ${format.toUpperCase()} file.`, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setPhotos([]);
    setResultState(null);
    setSheetDataUrl(null);
    setIsProcessing(false);
    setNumberOfCopies(8);
    setImagePositions({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const faqSchema = {
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "How do I create passport photos on an A4 sheet?", "acceptedAnswer": { "@type": "Answer", "text": "Upload your photos, crop each one to passport size, set the number of copies, generate the sheet, and download as JPEG or PDF." } },
      { "@type": "Question", "name": "Can I add multiple photos to one sheet?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, you can upload multiple photos and set how many copies of each you want on the A4 sheet." } },
      { "@type": "Question", "name": "What formats can I download?", "acceptedAnswer": { "@type": "Answer", "text": "You can download your passport photo sheet as a high-quality JPEG or PDF file." } }
    ]
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <SEO path="/tools/passport-photo-maker" faqSchema={faqSchema} />
      <div className="flex flex-col min-h-screen bg-secondary/10 p-4 sm:p-6">
        <header className="flex items-center justify-between mb-8">
          <Button variant="ghost" asChild>
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools</Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-primary text-center">Passport Photo Maker</h1>
        </header>

        <main className="flex-1 flex flex-col items-center">
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Create Your Passport Photos on A4 Sheet</CardTitle>
              <CardDescription>1. Upload photos. 2. Crop each one. 3. Set copies. 4. Generate & arrange. 5. Download.</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {!resultState ? (
                  <SetupView
                    photos={photos}
                    numberOfCopies={numberOfCopies}
                    setNumberOfCopies={setNumberOfCopies}
                    onImageUpload={handleImageUpload}
                    onStartCropping={startCropping}
                    onRemovePhoto={removePhoto}
                    onGenerateSheet={generatePhotoSheet}
                    fileInputRef={fileInputRef}
                  />
                ) : (
                  <ResultView
                    photos={photos.filter(p => p.cropped)}
                    numberOfCopies={numberOfCopies}
                    onSheetUpdate={setSheetDataUrl}
                    onReset={resetState}
                    onDownload={downloadAs}
                    isProcessing={isProcessing}
                    sheetDataUrl={sheetDataUrl}
                    imagePositions={imagePositions}
                    setImagePositions={setImagePositions}
                  />
                )}
              </AnimatePresence>
              {!resultState && <HowToUse />}
            </CardContent>
          </Card>
        </main>
      </div>

      <SimpleCropDialog
        isOpen={!!currentCroppingPhoto}
        onClose={() => setCurrentCroppingPhoto(null)}
        imageUrl={currentCroppingPhoto?.source}
        onCropComplete={handleCropComplete}
        aspectRatio={aspect}
      />
    </DndProvider>
  );
};

export default PassportPhotoMakerPage;
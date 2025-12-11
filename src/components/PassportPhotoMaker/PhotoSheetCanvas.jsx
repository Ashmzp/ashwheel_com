import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import DraggableImage from './DraggableImage';

const PhotoSheetCanvas = ({ onSheetUpdate, isVisible, imagePositions, setImagePositions }) => {
    const stageRef = useRef(null);
    const [loadedImages, setLoadedImages] = useState(new Set());
    const containerScale = 0.25;
    const dpi = 300;
    const a4WidthPx = Math.floor(8.27 * dpi);
    const a4HeightPx = Math.floor(11.69 * dpi);

    const handleDragEnd = (e, id) => {
        const newPositions = {
            ...imagePositions,
            [id]: { ...imagePositions[id], x: e.target.x(), y: e.target.y() }
        };
        setImagePositions(newPositions);
    };

    const handleImageLoad = useCallback((id) => {
        setLoadedImages(prev => {
            if (prev.has(id)) return prev;
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    }, []);

    useEffect(() => {
        const currentIds = Object.keys(imagePositions);
        const allLoaded = currentIds.length > 0 && currentIds.every(id => loadedImages.has(id));

        if (stageRef.current && onSheetUpdate && allLoaded) {
            // Small timeout to ensure last image renders on canvas
            const timeoutId = setTimeout(() => {
                const dataUrl = stageRef.current.toDataURL({
                    mimeType: 'image/jpeg',
                    quality: 1.0,
                    pixelRatio: 1 / containerScale
                });
                onSheetUpdate(dataUrl);
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [imagePositions, loadedImages, onSheetUpdate, containerScale]);

    const containerStyle = {
        display: isVisible ? 'block' : 'none',
        width: '100%',
        maxWidth: `${a4WidthPx * containerScale}px`,
        margin: 'auto',
        background: 'transparent',
    };

    const stageContainerStyle = {
        position: 'relative',
        width: '100%',
        paddingTop: `${(a4HeightPx / a4WidthPx) * 100}%`,
        overflow: 'hidden',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
    };

    const stageStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    };

    return (
        <div style={containerStyle}>
            <div style={stageContainerStyle}>
                <Stage
                    width={a4WidthPx * containerScale}
                    height={a4HeightPx * containerScale}
                    scaleX={containerScale}
                    scaleY={containerScale}
                    ref={stageRef}
                    style={stageStyle}
                >
                    <Layer>
                        <Rect x={0} y={0} width={a4WidthPx} height={a4HeightPx} fill="white" />
                        {Object.entries(imagePositions).map(([id, { src, x, y, width, height }]) => (
                            <DraggableImage
                                key={id}
                                src={src}
                                onDragEnd={(e) => handleDragEnd(e, id)}
                                onLoad={() => handleImageLoad(id)}
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};

export default PhotoSheetCanvas;
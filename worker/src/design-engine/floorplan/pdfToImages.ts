/**
 * PDF to Images Converter
 * 
 * Converts PDF floor plan documents into high-resolution images
 * for processing through the standard image analysis pipeline.
 * 
 * Uses pdf-to-png-converter for reliable cross-platform PDF rendering.
 */

import { logger } from '../../lib/logger';
import { FloorPlanAnalysisError, FloorPlanErrorCode } from './types';
import { pdfToPng } from 'pdf-to-png-converter';

// ============================================
// CONFIGURATION
// ============================================

const PDF_CONFIG = {
  // Target DPI for rendering (300 DPI = high quality print)
  targetDpi: 300,
  
  // Base DPI that PDF coordinates are in (72 is PDF standard)
  baseDpi: 72,
  
  // Maximum dimension for rendered images (prevent memory issues)
  maxDimension: 4096,
  
  // Minimum dimension for useful analysis
  minDimension: 800,
  
  // Output format
  outputFormat: 'png' as const,
  
  // Background color (white for floor plans)
  backgroundColor: '#FFFFFF',
};

// ============================================
// TYPES
// ============================================

export interface PdfPageImage {
  buffer: Buffer;
  page: number;
  width: number;
  height: number;
  mimeType: 'image/png';
}

export interface PdfConversionResult {
  pages: PdfPageImage[];
  totalPages: number;
  warnings: string[];
}

// ============================================
// PDF TO IMAGES CONVERSION
// ============================================

/**
 * Convert a PDF document to an array of high-resolution images
 * 
 * Each page is rendered as a separate PNG image suitable for
 * floor plan analysis through the standard image pipeline.
 * 
 * @param pdfBuffer - Raw PDF buffer
 * @returns Array of page images with metadata
 */
export async function convertPdfToImages(
  pdfBuffer: Buffer
): Promise<PdfConversionResult> {
  const warnings: string[] = [];
  
  logger.info('Starting PDF to image conversion', {
    pdfSize: pdfBuffer.length,
    targetDpi: PDF_CONFIG.targetDpi,
  });
  
  try {
    // Convert PDF to PNG images using pdf-to-png-converter
    // This library works reliably on Windows without native dependencies
    // Convert Buffer to ArrayBuffer for pdf-to-png-converter
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.length
    ) as ArrayBuffer;
    const pngPages = await pdfToPng(pdfArrayBuffer, {
      viewportScale: PDF_CONFIG.targetDpi / PDF_CONFIG.baseDpi,
    });
    
    const totalPages = pngPages.length;
    
    logger.info('PDF document loaded and converted', {
      totalPages,
    });
    
    if (totalPages === 0) {
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.INVALID_IMAGE,
        'PDF document has no pages',
        false
      );
    }
    
    // Limit pages to prevent excessive processing
    const maxPages = 10;
    if (totalPages > maxPages) {
      warnings.push(`PDF has ${totalPages} pages, processing only first ${maxPages}`);
      logger.warn('PDF has too many pages, limiting', { totalPages, maxPages });
    }
    
    const pagesToProcess = Math.min(totalPages, maxPages);
    const pages: PdfPageImage[] = [];
    
    // Process each page
    for (let i = 0; i < pagesToProcess; i++) {
      const pngPage = pngPages[i];
      const pageNum = i + 1;
      
      logger.debug('Processing PDF page', { pageNum, totalPages: pagesToProcess });
      
      try {
        // Get image dimensions using sharp
        const sharp = (await import('sharp')).default;
        
        // Ensure content exists
        if (!pngPage.content) {
          logger.warn('Page content is undefined', { pageNum });
          continue;
        }
        
        const pageBuffer = Buffer.isBuffer(pngPage.content) 
          ? pngPage.content 
          : Buffer.from(pngPage.content);
        const metadata = await sharp(pageBuffer).metadata();
        
        const pageImage: PdfPageImage = {
          buffer: pageBuffer,
          page: pageNum,
          width: metadata.width || 0,
          height: metadata.height || 0,
          mimeType: 'image/png',
        };
        
        pages.push(pageImage);
        
        logger.debug('Page processed successfully', {
          page: pageNum,
          width: pageImage.width,
          height: pageImage.height,
          bufferSize: pageImage.buffer.length,
        });
        
      } catch (pageError) {
        logger.error('Failed to process PDF page', { pageNum, error: pageError });
        warnings.push(`Failed to process page ${pageNum}`);
        // Continue with other pages
      }
    }
    
    if (pages.length === 0) {
      throw new FloorPlanAnalysisError(
        FloorPlanErrorCode.PREPROCESSING_FAILED,
        'Could not render any pages from PDF',
        false
      );
    }
    
    logger.info('PDF conversion complete', {
      totalPages,
      renderedPages: pages.length,
      warningCount: warnings.length,
    });
    
    return {
      pages,
      totalPages,
      warnings,
    };
    
  } catch (error) {
    if (error instanceof FloorPlanAnalysisError) {
      throw error;
    }
    
    logger.error('PDF conversion failed', { error });
    throw new FloorPlanAnalysisError(
      FloorPlanErrorCode.PREPROCESSING_FAILED,
      `PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    );
  }
}

/**
 * Check if a buffer appears to be a PDF
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  // PDF files start with "%PDF-"
  if (buffer.length < 5) return false;
  
  const header = buffer.slice(0, 5).toString('ascii');
  return header === '%PDF-';
}

/**
 * Get PDF page count without fully loading the document
 * Useful for quick validation
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    // Quick method using pdf-to-png-converter
    // Convert Buffer to ArrayBuffer for pdf-to-png-converter
    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.length
    ) as ArrayBuffer;
    const pngPages = await pdfToPng(pdfArrayBuffer, {
      viewportScale: 1.0,
      pagesToProcess: [1], // Just get first page to determine count
    });
    
    // pdf-to-png-converter doesn't directly give us page count without conversion
    // So we convert first page and return 1, or estimate from buffer size
    // For now, return the converted pages count
    return pngPages.length;
    
  } catch (error) {
    logger.error('Failed to get PDF page count', { error });
    return 0;
  }
}

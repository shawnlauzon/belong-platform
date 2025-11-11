import type { ImageCropData } from '../types';

export class ImageCropDataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageCropDataValidationError';
  }
}

/**
 * Validates image crop data array
 * @throws {ImageCropDataValidationError} if validation fails
 */
export function validateImageCropData(
  imageCropData: Array<ImageCropData | null> | undefined,
  imageUrls: string[] | undefined,
): void {
  // If no crop data, no validation needed
  if (!imageCropData) {
    return;
  }

  // If crop data provided, imageUrls must also be provided
  if (!imageUrls || imageUrls.length === 0) {
    throw new ImageCropDataValidationError(
      'imageCropData cannot be provided without imageUrls',
    );
  }

  // Arrays must have matching lengths
  if (imageCropData.length !== imageUrls.length) {
    throw new ImageCropDataValidationError(
      `imageCropData length (${imageCropData.length}) must match imageUrls length (${imageUrls.length})`,
    );
  }

  // Validate each crop data entry
  imageCropData.forEach((cropData, index) => {
    // Null entries are allowed (no crop for that image)
    if (cropData === null) {
      return;
    }

    // Validate crop data structure
    const { x, y, width, height } = cropData;

    // Check all required fields exist and are numbers
    if (typeof x !== 'number' || typeof y !== 'number' ||
        typeof width !== 'number' || typeof height !== 'number') {
      throw new ImageCropDataValidationError(
        `imageCropData[${index}]: all fields (x, y, width, height) must be numbers`,
      );
    }

    // Validate x is in range [0, 1]
    if (x < 0 || x > 1) {
      throw new ImageCropDataValidationError(
        `imageCropData[${index}].x must be between 0 and 1 (got ${x})`,
      );
    }

    // Validate y is in range [0, 1]
    if (y < 0 || y > 1) {
      throw new ImageCropDataValidationError(
        `imageCropData[${index}].y must be between 0 and 1 (got ${y})`,
      );
    }

    // Validate width is in range (0, 1] (must be positive)
    if (width <= 0 || width > 1) {
      throw new ImageCropDataValidationError(
        `imageCropData[${index}].width must be between 0 (exclusive) and 1 (inclusive) (got ${width})`,
      );
    }

    // Validate height is in range (0, 1] (must be positive)
    if (height <= 0 || height > 1) {
      throw new ImageCropDataValidationError(
        `imageCropData[${index}].height must be between 0 (exclusive) and 1 (inclusive) (got ${height})`,
      );
    }

    // Validate crop doesn't exceed bounds
    if (x + width > 1) {
      throw new ImageCropDataValidationError(
        `imageCropData[${index}]: x + width (${x + width}) exceeds 1`,
      );
    }

    if (y + height > 1) {
      throw new ImageCropDataValidationError(
        `imageCropData[${index}]: y + height (${y + height}) exceeds 1`,
      );
    }
  });
}

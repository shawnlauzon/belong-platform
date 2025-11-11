import { describe, it, expect } from 'vitest';
import {
  validateImageCropData,
  ImageCropDataValidationError,
} from '../../api/validateImageCropData';

describe('validateImageCropData', () => {
  describe('no validation needed', () => {
    it('should pass when imageCropData is undefined', () => {
      expect(() =>
        validateImageCropData(undefined, ['url1', 'url2']),
      ).not.toThrow();
    });

    it('should pass when both imageCropData and imageUrls are undefined', () => {
      expect(() => validateImageCropData(undefined, undefined)).not.toThrow();
    });
  });

  describe('array length validation', () => {
    it('should throw when imageCropData provided without imageUrls', () => {
      expect(() =>
        validateImageCropData([null], undefined),
      ).toThrow(ImageCropDataValidationError);
      expect(() =>
        validateImageCropData([null], undefined),
      ).toThrow('imageCropData cannot be provided without imageUrls');
    });

    it('should throw when imageCropData provided with empty imageUrls', () => {
      expect(() =>
        validateImageCropData([null], []),
      ).toThrow(ImageCropDataValidationError);
      expect(() =>
        validateImageCropData([null], []),
      ).toThrow('imageCropData cannot be provided without imageUrls');
    });

    it('should throw when array lengths do not match', () => {
      expect(() =>
        validateImageCropData([null, null], ['url1']),
      ).toThrow(ImageCropDataValidationError);
      expect(() =>
        validateImageCropData([null, null], ['url1']),
      ).toThrow('imageCropData length (2) must match imageUrls length (1)');
    });

    it('should pass when array lengths match', () => {
      expect(() =>
        validateImageCropData([null, null], ['url1', 'url2']),
      ).not.toThrow();
    });
  });

  describe('crop data value validation', () => {
    const imageUrls = ['url1'];

    it('should pass with null crop data', () => {
      expect(() => validateImageCropData([null], imageUrls)).not.toThrow();
    });

    it('should pass with valid crop data', () => {
      expect(() =>
        validateImageCropData([{ x: 0.1, y: 0.2, width: 0.5, height: 0.6 }], imageUrls),
      ).not.toThrow();
    });

    it('should pass with x and y at 0', () => {
      expect(() =>
        validateImageCropData([{ x: 0, y: 0, width: 1, height: 1 }], imageUrls),
      ).not.toThrow();
    });

    it('should pass with crop at bounds', () => {
      expect(() =>
        validateImageCropData([{ x: 0.5, y: 0.5, width: 0.5, height: 0.5 }], imageUrls),
      ).not.toThrow();
    });

    describe('x validation', () => {
      it('should throw when x < 0', () => {
        expect(() =>
          validateImageCropData([{ x: -0.1, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: -0.1, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0].x must be between 0 and 1 (got -0.1)');
      });

      it('should throw when x > 1', () => {
        expect(() =>
          validateImageCropData([{ x: 1.1, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 1.1, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0].x must be between 0 and 1 (got 1.1)');
      });
    });

    describe('y validation', () => {
      it('should throw when y < 0', () => {
        expect(() =>
          validateImageCropData([{ x: 0, y: -0.1, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0, y: -0.1, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0].y must be between 0 and 1 (got -0.1)');
      });

      it('should throw when y > 1', () => {
        expect(() =>
          validateImageCropData([{ x: 0, y: 1.1, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0, y: 1.1, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0].y must be between 0 and 1 (got 1.1)');
      });
    });

    describe('width validation', () => {
      it('should throw when width <= 0', () => {
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 0, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 0, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0].width must be between 0 (exclusive) and 1 (inclusive) (got 0)');
      });

      it('should throw when width > 1', () => {
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 1.1, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 1.1, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0].width must be between 0 (exclusive) and 1 (inclusive) (got 1.1)');
      });
    });

    describe('height validation', () => {
      it('should throw when height <= 0', () => {
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 0.5, height: 0 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 0.5, height: 0 }], imageUrls),
        ).toThrow('imageCropData[0].height must be between 0 (exclusive) and 1 (inclusive) (got 0)');
      });

      it('should throw when height > 1', () => {
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 0.5, height: 1.1 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0, y: 0, width: 0.5, height: 1.1 }], imageUrls),
        ).toThrow('imageCropData[0].height must be between 0 (exclusive) and 1 (inclusive) (got 1.1)');
      });
    });

    describe('bounds checking', () => {
      it('should throw when x + width > 1', () => {
        expect(() =>
          validateImageCropData([{ x: 0.6, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0.6, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0]: x + width (1.1) exceeds 1');
      });

      it('should throw when y + height > 1', () => {
        expect(() =>
          validateImageCropData([{ x: 0, y: 0.6, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 0, y: 0.6, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0]: y + height (1.1) exceeds 1');
      });
    });

    describe('type validation', () => {
      it('should throw when x is not a number', () => {
        expect(() =>
          validateImageCropData([{ x: 'bad' as unknown as number, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow(ImageCropDataValidationError);
        expect(() =>
          validateImageCropData([{ x: 'bad' as unknown as number, y: 0, width: 0.5, height: 0.5 }], imageUrls),
        ).toThrow('imageCropData[0]: all fields (x, y, width, height) must be numbers');
      });
    });

    describe('multiple images', () => {
      it('should validate all crop data entries', () => {
        expect(() =>
          validateImageCropData(
            [
              { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
              null,
              { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
            ],
            ['url1', 'url2', 'url3'],
          ),
        ).not.toThrow();
      });

      it('should report correct index in error messages', () => {
        expect(() =>
          validateImageCropData(
            [
              { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
              { x: 1.5, y: 0, width: 0.5, height: 0.5 },
            ],
            ['url1', 'url2'],
          ),
        ).toThrow('imageCropData[1].x must be between 0 and 1 (got 1.5)');
      });
    });
  });
});

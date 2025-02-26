#!/usr/bin/env python3

import sys
import rasterio
import numpy as np
from PIL import Image

def convert_tiff_to_heightmap(input_tiff, output_png):
    """
    Reads a single-band GeoTIFF, applies no-data masking, rescales valid values
    into [0, 255], and saves as a grayscale PNG (heightmap).
    Also prints out statistics about the valid data range.
    """

    # Open the GeoTIFF
    with rasterio.open(input_tiff) as src:
        # Read the first band as float32
        data = src.read(1).astype(np.float32)

        # Fetch the no-data value (if defined)
        nodata_val = src.nodata

        # Mask out no-data values by setting them to NaN
        if nodata_val is not None:
            data = np.where(data == nodata_val, np.nan, data)

        # Compute stats excluding NaNs
        data_min = np.nanmin(data)
        data_max = np.nanmax(data)
        data_mean = np.nanmean(data)
        data_stddev = np.nanstd(data)

        # Print the stats
        print("=== Data Statistics ===")
        print(f"  Minimum Value: {data_min}")
        print(f"  Maximum Value: {data_max}")
        print(f"  Mean Value:    {data_mean}")
        print(f"  Std. Dev.:     {data_stddev}")
        print(f"  Elevation Range: {data_max - data_min}")
        print("=======================\n")

        # If all valid data are the same, handle edge case
        if np.isclose(data_min, data_max):
            print("Warning: The valid data range is zero. "
                  "All values are the same. Output will be a flat 128 grayscale.")
            scaled = np.full_like(data, 128, dtype=np.uint8)
        else:
           
            # Scale data into [0, 1]
            scaled = (data - data_min) / (data_max - data_min)

            # Clip to [0, 1] to avoid overshoots
            scaled = np.clip(scaled, 0.0, 1.0)

            # Convert NaN or Inf to valid float values
            scaled = np.nan_to_num(scaled, nan=0.0, posinf=1.0, neginf=0.0)

            # Finally convert to [0, 255] as uint8
            scaled = (scaled * 255).astype(np.uint8)


        # Convert to a Pillow Image in 'L' (8-bit grayscale)
        img = Image.fromarray(scaled, mode='L')

        # Save the resulting PNG
        img.save(output_png)
        print(f"Saved heightmap to {output_png}")

if __name__ == "__main__":
    # Usage:
    # python process_tiff.py input.tif output.png
    if len(sys.argv) < 3:
        print("Usage: python process_tiff.py <input_tiff> <output_png>")
        sys.exit(1)

    input_tiff = sys.argv[1]
    output_png = sys.argv[2]
    convert_tiff_to_heightmap(input_tiff, output_png)

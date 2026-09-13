#!/usr/bin/env python3

import os
import sys
import tempfile
from pathlib import Path

import requests

BASE_URL = "https://ramaswalayanjepara.store"
TOKEN = "admin"

PRODUCTS_URL = f"{BASE_URL}/sekuro/api/products"
UPLOAD_IMAGE_URL = f"{BASE_URL}/sekuro/api/auth/images"
PATCH_PRODUCT_URL = f"{BASE_URL}/sekuro/api/auth/products"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
}


def get_products():
    response = requests.get(
        PRODUCTS_URL,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def get_openfoodfacts_image(barcode):
    url = (
        f"https://world.openfoodfacts.org/api/v2/product/"
        f"{barcode}?fields=code,product_name,image_front_url"
    )

    response = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "sekuro-image-updater/1.0",
        },
    )

    data = response.json()

    if data.get("status") != 1:
        return None

    return data.get("product", {}).get("image_front_url")


def download_image(url, directory):
    response = requests.get(
        url,
        timeout=60,
        stream=True,
    )
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")

    extension = ".jpg"

    if "png" in content_type:
        extension = ".png"
    elif "webp" in content_type:
        extension = ".webp"
    elif "jpeg" in content_type:
        extension = ".jpg"

    path = Path(directory) / f"image{extension}"

    with path.open("wb") as f:
        for chunk in response.iter_content(64 * 1024):
            if chunk:
                f.write(chunk)

    return path


def patch_product(product):
    response = requests.post(
        PATCH_PRODUCT_URL,
        headers={
            **HEADERS,
            "Content-Type": "application/json",
        },
        json=product,
        timeout=30,
    )

    response.raise_for_status()


def upload_image(path):
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }

    content_type = mime_types.get(path.suffix.lower())

    if not content_type:
        raise RuntimeError(f"Unsupported image type: {path.suffix}")

    with path.open("rb") as f:
        response = requests.post(
            UPLOAD_IMAGE_URL,
            headers={
                **HEADERS,
                "Content-Type": content_type,
            },
            data=f,
            timeout=60,
        )

    response.raise_for_status()

    return response.json()


def is_empty_image(product):
    image = product.get("image")

    return image is None or image == ""


def process_product(product):
    product_id = product.get("id")
    barcode = product.get("barcode")

    if not product_id:
        print("  SKIP: no product id")
        return

    if not barcode:
        print("  SKIP: no barcode")
        return

    print(f"[{product_id}] barcode={barcode}")

    image_url = get_openfoodfacts_image(barcode)

    if not image_url:
        print("  SKIP: image not found on Open Food Facts")
        return

    print(f"  found: {image_url}")

    with tempfile.TemporaryDirectory(prefix="sekuro-image-") as tmp:
        image_path = download_image(image_url, tmp)

        print(f"  downloaded: {image_path}")

        uploaded = upload_image(image_path)

        print(f"  uploaded: {uploaded}")

        # This assumes POST /images returns something like:
        #
        # {
        #     "url": "/sekuro/images/xxx.jpg"
        # }
        #
        # Change this according to your actual response.
        image = uploaded.get("url")

        if not image:
            raise RuntimeError(
                f"Image upload response does not contain 'url': {uploaded}"
            )

        product["image"] = image
        patch_product(product)

        print(f"  patched product {product_id}")


def main():
    if not TOKEN:
        print("SEKURO_TOKEN is not set", file=sys.stderr)
        sys.exit(1)

    print("Fetching products...")
    products = get_products()

    print(f"Found {len(products)} products")

    empty_products = [product for product in products if is_empty_image(product)]

    print(f"Products without images: {len(empty_products)}")
    print()

    success = 0
    failed = 0

    for index, product in enumerate(empty_products, 1):
        print(f"[{index}/{len(empty_products)}]")

        try:
            process_product(product)
            success += 1
        except Exception as e:
            failed += 1
            print(f"  ERROR: {e}")
            exit(1)

        print()

    print("Done.")
    print(f"Successful: {success}")
    print(f"Failed:     {failed}")


if __name__ == "__main__":
    main()

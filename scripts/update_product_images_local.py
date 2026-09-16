#!/usr/bin/env python3

from pathlib import Path
import mimetypes

import requests

BASE_URL = "https://sekuro.ramaswalayanjepara.store/api"
HEADERS = {
    "Authorization": "Bearer admin",
}


def main():
    # Get all products
    response = requests.get(
        f"{BASE_URL}/products",
        headers=HEADERS,
    )
    response.raise_for_status()

    products = response.json()

    # { product.id: product }
    products_map = {product["id"]: product for product in products}

    print(f"Loaded {len(products_map)} products.")

    for image_path in Path("images").iterdir():
        if not image_path.is_file():
            continue

        product_id = image_path.stem

        product = products_map.get(product_id)
        if product is None:
            print(f"SKIP: product not found: {product_id}")
            continue

        mime_type, _ = mimetypes.guess_type(image_path)

        if mime_type is None:
            print(f"SKIP: unknown image type: {image_path}")
            continue

        print(f"Uploading: {image_path.name} -> {product_id}")

        # Upload raw image bytes.
        with image_path.open("rb") as file:
            response = requests.post(
                f"{BASE_URL}/auth/images",
                headers={
                    **HEADERS,
                    "Content-Type": mime_type,
                },
                data=file,
            )

        response.raise_for_status()

        url = response.json()["url"]

        print(f"  uploaded: {url}")

        # Update product.
        updated_product = {
            **product,
            "image": url,
        }

        response = requests.post(
            f"{BASE_URL}/auth/products",
            headers={
                **HEADERS,
                "Content-Type": "application/json",
            },
            json=updated_product,
        )
        response.raise_for_status()

        products_map[product_id] = updated_product

        print(f"  updated: {product_id}")

    print("Done.")


if __name__ == "__main__":
    main()

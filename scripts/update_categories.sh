#!/usr/bin/env bash

set -euo pipefail

BASE_URL="http://localhost:3000/sekuro/api/auth/categories"

update_category() {
	local id="$1"
	local icon="$2"
	local name="$3"
	local priority="$4"

	curl -fsS \
		-X POST "$BASE_URL" \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer admin" \
		--data "$(jq -n \
			--arg id "$id" \
			--arg icon "$icon" \
			--arg name "$name" \
			--argjson priority "$priority" \
			'{
                id: $id,
                icon: $icon,
                name: $name,
                priority: $priority
            }')" \
		>/dev/null

	printf 'updated: %-25s -> %s\n' "$id" "$name"
}

# Food staples
update_category "BERAS" "fa-wheat-awn" "Beras" 10
update_category "MINYAK GORENG" "fa-bottle-droplet" "Minyak Goreng" 20
update_category "ANEKA BUMBU" "fa-pepper-hot" "Bumbu & Rempah" 30
update_category "MIE INSTAN" "fa-bowl-food" "Mie Instan" 35
update_category "BAHAN KUE" "fa-cookie-bite" "Bahan Kue" 40
update_category "MAKANAN KALENG" "fa-box" "Makanan Kaleng" 50
update_category "BUAH KALENG" "fa-apple-whole" "Buah Kaleng" 55
update_category "MAKANAN BAYI" "fa-baby" "Makanan Bayi" 60
update_category "MAKANAN SARAPAN" "fa-bowl-food" "Makanan Sarapan" 70
update_category "MAKANAN PENUTUP" "fa-ice-cream" "Makanan Penutup" 80

# Snacks
update_category "BISKUIT & WAFER" "fa-cookie" "Biskuit & Wafer" 100
update_category "BISCUIT & WAFER 2" "fa-cookie" "Biskuit & Wafer 2" 110
update_category "SNACK MODERN" "fa-burger" "Snack Modern" 120
update_category "PERMEN & COKLAT" "fa-candy-cane" "Permen & Coklat" 130
update_category "PERMEN" "fa-candy-cane" "Permen" 140
update_category "SELAI & MADU" "fa-jar" "Selai & Madu" 150

# Drinks
update_category "MINUMAN BUBUK" "fa-mug-hot" "Minuman Bubuk" 200
update_category "SIAP MINUM" "fa-bottle-water" "Minuman Siap Minum" 210
update_category "UHT" "fa-glass-water" "Susu UHT" 220
update_category "SUSU & CREAM" "fa-glass-water" "Susu & Cream" 230
update_category "SYRUP" "fa-bottle-droplet" "Sirup" 240

# Bakery & frozen
update_category "BAKERY" "fa-bread-slice" "Bakery" 300
update_category "FROZEN FOOD" "fa-snowflake" "Frozen Food" 310

# Pet
update_category "MAKANAN KUCING" "fa-cat" "Makanan Kucing" 400

# Household
update_category "HOME CLEANING" "fa-spray-can-sparkles" "Home Cleaning" 500
update_category "LOUNDRY" "fa-shirt" "Laundry" 510
update_category "AIR FRESHENER" "fa-wind" "Air Freshener" 520
update_category "INSEKTISIDA" "fa-bug" "Insektisida" 530
update_category "TISSUE" "fa-toilet-paper" "Tissue" 540

# Baby
update_category "BABY CARE" "fa-baby" "Baby Care" 600
update_category "POPOK BAYI" "fa-baby" "Popok Bayi" 610

# Personal care
update_category "BEAUTY" "fa-wand-magic-sparkles" "Beauty" 700
update_category "HEALTH CARE" "fa-heart-pulse" "Health Care" 710
update_category "PERSONAL CARE" "fa-pump-soap" "Personal Care" 720
update_category "PEMBALUT" "fa-ribbon" "Pembalut" 730
update_category "POPOK DEWASA" "fa-person" "Popok Dewasa" 740

echo "Done."

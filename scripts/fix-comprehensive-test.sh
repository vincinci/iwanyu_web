#!/bin/bash
# Fix comprehensive test schema mismatches

FILE="scripts/comprehensive-test.mjs"

# Backup
cp "$FILE" "$FILE.backup"

# Fix all order status: "Pending" -> "Placed"
sed -i '' 's/status: "Pending"/status: "Placed"/g' "$FILE"

# Fix cart_items references
sed -i '' 's/cart_items/carts/g' "$FILE"

# Fix customer -> buyer
sed -i '' 's/customerId/buyerId/g' "$FILE"

# Fix vendor -> seller (but not vendorId or vendor_id which are table columns)
sed -i '' 's/vendorId, /sellerId, /g' "$FILE"
sed -i '' 's/let vendorId;/let sellerId;/g' "$FILE"

# Fix verification_status issues (vendor_applications only has 'status', not 'verification_status')
sed -i '' 's/verification_status: "pending"/status: "pending"/g' "$FILE"
sed -i '' 's/verification_status: "approved"/status: "approved"/g' "$FILE"

echo "Fixed comprehensive-test.mjs"

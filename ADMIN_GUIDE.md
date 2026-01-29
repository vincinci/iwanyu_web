# Admin Dashboard Guide

## Overview
The Admin Dashboard provides powerful controls for managing your marketplace with a clean, minimalistic interface designed for speed and efficiency.

## Access
- **URL**: `/admin`
- **Required Role**: `admin`
- **Authentication**: Must be signed in with admin privileges

## Key Features

### 1. Vendor Management

#### Approve Vendors
Admins have full control over vendor approvals:

**From Applications:**
- New vendor applications appear in the "Vendor Applications" section
- Click "Approve" to create a vendor account and grant selling permissions
- Click "Reject" to decline the application

**From Vendor List:**
- Any vendor without "approved" status shows an "Approve" button
- Click to instantly grant selling permissions
- Visual status badges show current state (Pending/Approved/Rejected)

**Quick Approval via SQL (Database Access):**
```sql
-- Approve specific vendor by ID
UPDATE vendors SET status = 'approved' WHERE id = 'VENDOR_ID_HERE';

-- Approve all pending vendors (use with caution!)
UPDATE vendors SET status = 'approved' WHERE status IS NULL OR status = 'pending';
```

#### Revoke/Restore Vendors
- **Revoke**: Temporarily disable a vendor's ability to sell
- **Restore**: Re-enable a previously revoked vendor
- Revoked vendors retain their products but cannot create new ones

### 2. Product Management

#### Category Management
- View all products with current categories
- Reassign products to different categories
- Save changes instantly with inline controls

#### Product Moderation
- **View**: Click eye icon to see product details
- **Delete**: Click trash icon to remove policy-violating products
- **Notify Vendor**: Deletion automatically sends notification with reason

#### Deletion Flow
1. Click trash icon on any product
2. Enter reason for removal (minimum 5 characters)
3. Confirm deletion
4. Vendor receives notification with your explanation

### 3. Dashboard Statistics

**Overview Metrics:**
- **Total Vendors**: All vendors in the system
- **Total Products**: All marketplace products
- **Pending Applications**: Vendor applications awaiting review

### 4. Navigation

**Quick Links:**
- Overview: Dashboard home
- Vendors: Jump to vendor management section
- Products: Jump to product management section
- Applications: Jump to pending applications

## Design Philosophy

### Minimalistic & Fast
- Clean white cards on subtle gray background
- No unnecessary borders or shadows
- Focus on content, not decoration
- Fast loading and responsive interactions

### Visual Hierarchy
- Large, bold numbers for metrics (4xl font)
- Clear section headings (xl/3xl fonts)
- Small, uppercase labels for context (xs font)
- Color-coded status indicators

### Color System
- **Black/Gray**: Primary actions and text
- **Green**: Approved status
- **Red**: Rejected/revoked status, destructive actions
- **Yellow**: Pending status
- **Blue**: Verified badges

### Interaction Patterns
- Rounded buttons (rounded-full)
- Hover states on all interactive elements
- Icon-only buttons for space efficiency
- Inline actions for quick workflows

## Common Tasks

### Task 1: Approve a New Vendor Application
1. Navigate to Admin Dashboard (`/admin`)
2. Scroll to "Vendor Applications" section
3. Review application details
4. Click "Approve" button
5. Toast notification confirms success
6. New vendor can now sell products

### Task 2: Approve an Existing Vendor
1. Navigate to "All Vendors" section
2. Find vendor with "Pending" or no status badge
3. Click "Approve" button next to vendor name
4. Toast confirms vendor is now approved
5. Vendor can immediately start selling

### Task 3: Remove a Policy-Violating Product
1. Navigate to "Product Management" section
2. Find the violating product
3. Click trash icon (🗑️)
4. Enter removal reason: "Product violates [specific policy]"
5. Click "Delete Product"
6. Vendor receives automated notification

### Task 4: Revoke Vendor Access
1. Find vendor in "All Vendors" section
2. Click "Revoke" button
3. Toast confirms vendor is revoked
4. Vendor cannot create new products
5. Existing products remain visible
6. Click "Restore" to re-enable

## API Functions

### Admin-Only Functions

```typescript
// Approve vendor (sets status to 'approved')
async function approveVendor(vendorId: string)

// Reject vendor (sets status to 'rejected')
async function rejectVendor(vendorId: string)

// Approve application (creates vendor, updates profile, marks application approved)
async function approveApplication(app: VendorApplication)

// Reject application (marks application rejected)
async function rejectApplication(app: VendorApplication)

// Toggle vendor revocation
async function toggleVendorRevoke(vendorId: string, currentRevoked: boolean)

// Update product category
async function updateProductCategory(productId: string, category: string)

// Delete product with reason (sends vendor notification)
async function deleteProductWithReason()
```

## Database Schema

### Vendors Table
```sql
vendors (
  id TEXT PRIMARY KEY,
  name TEXT,
  location TEXT,
  status TEXT,  -- 'pending' | 'approved' | 'rejected'
  verified BOOLEAN,
  revoked BOOLEAN,
  owner_user_id UUID
)
```

### Vendor Applications Table
```sql
vendor_applications (
  id TEXT PRIMARY KEY,
  owner_user_id UUID,
  store_name TEXT,
  location TEXT,
  status TEXT,  -- 'pending' | 'approved' | 'rejected'
  vendor_id TEXT,
  created_at TIMESTAMP
)
```

## Security Best Practices

1. **Role-Based Access**: Only users with `role = 'admin'` can access
2. **Audit Trail**: Consider logging all admin actions
3. **Vendor Notifications**: Always provide clear reasons for rejections/deletions
4. **Regular Review**: Periodically audit vendor activity
5. **Revocation vs Deletion**: Prefer revocation for temporary suspensions

## Troubleshooting

### "Access Denied" Error
- Ensure your user account has `role = 'admin'` in profiles table
- SQL: `UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';`

### Vendor Can't Create Products After Approval
- Check vendor status: `SELECT status FROM vendors WHERE id = 'VENDOR_ID';`
- Ensure status = 'approved' and revoked = false

### Product Deletion Not Working
- Verify reason is at least 5 characters
- Check admin is signed in
- Confirm product exists in database

## Performance Notes

- Dashboard loads all vendors and products on initial render
- Products limited to first 20 for performance
- Applications load only pending status
- Real-time updates require page refresh
- Consider pagination for 100+ vendors/products

## Future Enhancements

- [ ] Real-time updates via Supabase Realtime
- [ ] Product search and filtering
- [ ] Vendor analytics and insights
- [ ] Bulk actions (approve multiple vendors)
- [ ] Activity audit log
- [ ] Email notifications for vendors
- [ ] Advanced filtering and sorting
- [ ] Export data to CSV
- [ ] Vendor performance metrics
- [ ] Revenue and commission tracking

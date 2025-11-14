# Trading System

## Overview
This trading system allows users to trade game accounts with each other on the RealmExchange platform.

## Features

### 1. Create Trade Listings (`/trade`)
- Select multiple accounts from your inventory to list for sale
- Set an asking price by selecting items from a searchable database of 27,979 items
- Items are stored in `static/items.json` (extracted from Objects.xml)

### 2. Marketplace (`/`)
- View all active trade listings
- See account details (name, seasonal status, inventory items)
- See asking price (list of requested items)
- Options to:
  - Accept trade directly (no counter offer)
  - Make a counter offer with your own accounts
  - Cancel your own listings

### 3. Counter Offers
- Buyers can propose alternative payment using their own accounts
- Sellers receive offers and can accept/reject them
- All trades happen on an account-by-account basis (no individual items)

### 4. Account Ownership Transfer
- When a trade is accepted, account ownership automatically transfers
- Seller's listed accounts → Buyer
- Buyer's offered accounts → Seller (if counter offer accepted)
- Listing status updates to "completed"

## Database Schema

### `trade_listing`
- `id`: Unique listing ID
- `seller_id`: User ID of the seller
- `account_guids`: JSON array of account GUIDs being sold
- `asking_price`: JSON array of item names requested as payment
- `status`: active | completed | cancelled
- `created_at`: Timestamp

### `trade_offer`
- `id`: Unique offer ID
- `listing_id`: Reference to trade listing
- `buyer_id`: User ID of the buyer
- `offer_account_guids`: JSON array of account GUIDs being offered
- `status`: pending | accepted | rejected
- `created_at`: Timestamp

## Usage

### As a Seller:
1. Go to `/trade`
2. Select one or more accounts to sell
3. Search and select items as your asking price
4. Click "Create Listing"
5. Your listing appears on the marketplace
6. Accept incoming offers or cancel listing

### As a Buyer:
1. Browse marketplace on `/`
2. View listing details
3. Either:
   - Click "Accept (No Counter)" to accept directly
   - Click "Make Counter Offer" to propose your own accounts
4. Upon acceptance, accounts transfer automatically

## Security Notes
- All account ownership is verified before trades
- Users can only list accounts they own
- Users can only offer accounts they own
- Trades are atomic (all-or-nothing account transfers)

## Future Enhancements
- Notification system for new offers
- Trade history/completed trades view
- Rating/feedback system
- Escrow system for safer trades
- Direct messaging between traders

# iOS App Store Monetisation - Dialectica

> Research doc covering in-app purchases, subscriptions, and alternative payment options for the Dialectica iOS app.

---

## 1. Purchase Types

For an AI coaching app, two of Apple's four IAP types are relevant:

| Type | Use Case | How It Works |
|---|---|---|
| **Consumable** | AI credit top-ups (e.g. "Buy 50 AI tokens") | User buys, uses them up, can buy again. Not restored across devices automatically. |
| **Auto-Renewable Subscription** | Monthly/yearly plans (e.g. "Pro Plan - unlimited coaching") | Recurring billing. Apple handles renewal. You get 70% year 1, 85% year 2+. |

Optional: **Non-consumable** for a one-time "lifetime unlock" tier.

---

## 2. Apple's Commission Structure

- **Standard rate**: 30% on all IAP
- **Small Business Program** (< $1M annual revenue): **15%** on everything
- **Subscriptions**: 30% year 1 per subscriber, drops to **15%** after 12 consecutive months
- Dialectica almost certainly qualifies for the 15% rate initially via the Small Business Program

### Links
- [Small Business Program](https://developer.apple.com/app-store/small-business-program/)
- [Commission & Fees Reference](https://developer.apple.com/help/app-store-connect/making-payments-to-apple/understanding-taxes)

---

## 3. External Payment Option (Cost Saver)

As of 2025-2026, **US apps can link to external web checkout** without a special entitlement and without paying Apple commission. This means you can:

- Offer IAP through Apple's system (required for in-app purchases)
- **Also** link users to a web page where they buy credits/subscriptions via Stripe at 0% Apple commission (just Stripe's ~2.9%)

This is particularly relevant for AI credit top-ups where the 30% cut significantly hurts margins on API costs.

### Regional Rules
- **US**: No entitlement needed. Apps can freely include buttons/links to external checkout.
- **EU**: Single "communication & promotion of offers" entitlement required. Turning it on means removing IAP. Fee structure: 2% initial-acquisition + 5-13% Store Services + 5% Core Technology Commission.
- **Rest of world**: StoreKit External Purchase Link Entitlement required.

### Links
- [Apple External Purchase Docs](https://developer.apple.com/documentation/storekit/external-purchase)
- [RevenueCat App-to-Web Guide](https://www.revenuecat.com/blog/engineering/app-to-web-purchase-guidelines/)

---

## 4. Implementation Path (Expo / React Native)

Current stack: **Expo 54 + React Native 0.81 + Supabase**

### Option A: RevenueCat (Recommended)

- Library: `react-native-purchases`
- Handles receipt validation, subscription status, entitlements server-side
- Dashboard for analytics, A/B testing pricing
- Free tier up to $2.5K monthly tracked revenue
- Works with Expo via config plugin
- **Requires EAS development build** (not Expo Go)

```
npm install react-native-purchases
```

### Option B: react-native-iap (DIY)

- Library: `react-native-iap`
- Lower-level - you handle receipt validation yourself
- More control, no third-party dependency
- Also requires development build

### Why RevenueCat is Recommended

RevenueCat handles the hardest parts that are notoriously tricky to implement correctly:
- Receipt validation with Apple servers
- Subscription lifecycle management (renewals, grace periods, billing retry)
- Cross-platform entitlement tracking
- Subscription analytics and churn metrics
- Webhook handling for server-side events

### Links
- [RevenueCat Expo Integration](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [react-native-purchases GitHub](https://github.com/RevenueCat/react-native-purchases)
- [react-native-iap GitHub](https://github.com/hyochan/react-native-iap)
- [Expo IAP Guide](https://docs.expo.dev/guides/in-app-purchases/)

---

## 5. Setup Checklist

### Apple Developer Side

- [ ] Sign the **Paid Apps agreement** in App Store Connect (requires banking/tax info)
- [ ] Apply for the **Small Business Program** for 15% commission rate
- [ ] Create **consumable products** in App Store Connect (credit packs)
- [ ] Create **auto-renewable subscription group** with tiers
- [ ] Set up **sandbox test accounts** for development
- [ ] Configure **subscription pricing** and introductory offers

### Backend (Supabase) Side

- [ ] Create **user credits table** to track AI token balance per user
- [ ] Create **purchase history table** to log all transactions
- [ ] Implement **server-side receipt validation** (or use RevenueCat webhooks)
- [ ] Create **webhook endpoint** to handle subscription renewals, cancellations, refunds
- [ ] Implement credit deduction logic tied to AI API calls

### App Side

- [ ] Add `react-native-purchases` (or `react-native-iap`) to dependencies
- [ ] Add Expo config plugin to `app.json`
- [ ] Build **paywall UI** (subscription comparison, credit pack selection)
- [ ] Implement **purchase flow** (initiate, confirm, deliver)
- [ ] Implement **restore purchases** button (mandatory for App Review)
- [ ] Add **entitlement checks** throughout the app (gating premium features)
- [ ] Switch to **EAS development builds** (IAP does not work in Expo Go)

---

## 6. App Review Guidelines

Key rules that affect Dialectica:

1. **AI data disclosure (Guideline 5.1.2(i))**: Must disclose that user data is sent to third-party AI (Claude/Anthropic) and obtain explicit consent before doing so.
2. **All digital content purchases must use IAP**: Cannot use Stripe in-app for AI credits. External payment is only allowed via a web link that takes the user out of the app.
3. **Restore purchases button is mandatory**: Must be visible and functional.
4. **Subscription transparency**: Paywall must clearly show pricing, duration, free trial length, and how to cancel.
5. **SDK requirement**: Apps must be built with iOS 18 SDK (as of April 2025).

### Links
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [In-App Purchase HIG](https://developer.apple.com/design/human-interface-guidelines/in-app-purchase)

---

## 7. Suggested Product Structure

### Subscriptions (Auto-Renewable Group)

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | Limited sessions/month, basic coaches |
| Monthly Pro | $9.99/mo | Unlimited sessions, all coaches, priority AI |
| Annual Pro | $79.99/yr | Same as Monthly Pro, ~33% discount |

### Consumable Credit Packs (Top-Ups)

| Pack | Price | Effective Price/Credit |
|---|---|---|
| 10 AI credits | $1.99 | $0.20 |
| 50 AI credits | $7.99 | $0.16 |
| 100 AI credits | $12.99 | $0.13 |

> Pricing is indicative - finalise based on actual AI API costs per session and desired margin after Apple's cut.

---

## 8. Priority Implementation Order

1. **Sign the Paid Apps agreement** in App Store Connect
2. **Apply for the Small Business Program** (15% commission)
3. **Choose RevenueCat vs DIY** (recommendation: RevenueCat)
4. **Design pricing tiers** and credit system based on actual API costs
5. **Create products** in App Store Connect
6. **Implement library** - add RevenueCat, build paywall, connect to Supabase for credit tracking
7. **Test with sandbox** accounts
8. **Submit for review** with IAP products

---

## 9. Cost/Margin Analysis (Example)

Assuming an AI coaching session costs ~$0.05 in API fees:

| Scenario | Revenue per $9.99 sub | Apple Cut | Net to You |
|---|---|---|---|
| Standard (30%) | $9.99 | $3.00 | $6.99 |
| Small Business (15%) | $9.99 | $1.50 | $8.49 |
| Year 2+ subscriber (15%) | $9.99 | $1.50 | $8.49 |
| External web (Stripe ~3%) | $9.99 | $0.30 | $9.69 |

For consumable credit packs (10 credits at $1.99):

| Scenario | Revenue | Apple Cut | Net | API Cost (10 sessions) | Profit |
|---|---|---|---|---|---|
| Small Business (15%) | $1.99 | $0.30 | $1.69 | $0.50 | $1.19 |
| External web (Stripe ~3%) | $1.99 | $0.06 | $1.93 | $0.50 | $1.43 |

---

*Last updated: 2026-02-07*

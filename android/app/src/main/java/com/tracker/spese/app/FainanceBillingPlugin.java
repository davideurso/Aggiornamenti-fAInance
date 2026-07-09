package com.tracker.spese.app;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "FainanceBilling")
public class FainanceBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String TAG = "FainanceBilling";

    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private String pendingPlan;
    private String pendingProductId;
    private String pendingBasePlanId;

    @Override
    public void load() {
        PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build();

        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(pendingPurchasesParams)
                .build();
    }

    @PluginMethod
    public void purchase(final PluginCall call) {
        final String productId = call.getString("productId", "");
        final String basePlanId = call.getString("basePlanId", "");
        final String plan = call.getString("plan", "");
        final String offerTag = call.getString("offerTag", "");
        final boolean preferFreeTrial = call.getBoolean("preferFreeTrial", false);

        if (productId.trim().isEmpty() || basePlanId.trim().isEmpty() || plan.trim().isEmpty()) {
            call.reject("Dati acquisto mancanti.");
            return;
        }

        pendingPurchaseCall = call;
        pendingPlan = plan;
        pendingProductId = productId;
        pendingBasePlanId = basePlanId;

        runWhenReady(new Runnable() {
            @Override
            public void run() {
                queryAndLaunchPurchase(call, productId, basePlanId, plan, offerTag, preferFreeTrial);
            }
        }, call);
    }

    @PluginMethod
    public void restorePurchases(final PluginCall call) {
        runWhenReady(new Runnable() {
            @Override
            public void run() {
                QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build();
                billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Ripristino acquisti non riuscito: " + billingResult.getDebugMessage());
                        return;
                    }
                    JSObject result = resolvePlanFromPurchases(purchases);
                    call.resolve(result);
                });
            }
        }, call);
    }

    private void runWhenReady(final Runnable runnable, final PluginCall call) {
        if (billingClient == null) {
            load();
        }
        if (billingClient.isReady()) {
            runnable.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    runnable.run();
                } else {
                    call.reject("Google Play Billing non disponibile: " + billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected");
            }
        });
    }

    private void queryAndLaunchPurchase(final PluginCall call, final String productId, final String basePlanId, final String plan, final String offerTag, final boolean preferFreeTrial) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, queryProductDetailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Prodotto non disponibile: " + billingResult.getDebugMessage());
                return;
            }
            List<ProductDetails> productDetailsList = queryProductDetailsResult != null
                    ? queryProductDetailsResult.getProductDetailsList()
                    : null;
            if (productDetailsList == null || productDetailsList.isEmpty()) {
                String packageName = getContext() != null ? getContext().getPackageName() : "";
                call.reject("Prodotto non trovato su Google Play: " + productId + (packageName.length() > 0 ? ". Package build: " + packageName : ""));
                return;
            }

            ProductDetails selectedProduct = productDetailsList.get(0);
            String selectedOfferToken = findOfferToken(selectedProduct, basePlanId, offerTag, preferFreeTrial);
            if (selectedOfferToken == null || selectedOfferToken.trim().isEmpty()) {
                call.reject("Piano base non trovato su Google Play: " + basePlanId);
                return;
            }

            BillingFlowParams.ProductDetailsParams productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(selectedProduct)
                    .setOfferToken(selectedOfferToken)
                    .build();

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(productDetailsParams))
                    .build();

            Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity Android non disponibile.");
                return;
            }

            BillingResult launchResult = billingClient.launchBillingFlow(activity, flowParams);
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Impossibile avviare acquisto: " + launchResult.getDebugMessage());
            }
        });
    }

    private String findOfferToken(ProductDetails productDetails, String basePlanId, String preferredOfferTag, boolean preferFreeTrial) {
        List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;

        String cleanTag = preferredOfferTag == null ? "" : preferredOfferTag.trim();
        ProductDetails.SubscriptionOfferDetails firstMatchingBasePlan = null;
        ProductDetails.SubscriptionOfferDetails firstStandardOffer = null;
        ProductDetails.SubscriptionOfferDetails firstFreeTrialOffer = null;

        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (!basePlanId.equals(offer.getBasePlanId())) continue;
            if (firstMatchingBasePlan == null) firstMatchingBasePlan = offer;

            boolean hasFreeTrial = hasFreeTrialPhase(offer);
            if (hasFreeTrial && firstFreeTrialOffer == null) firstFreeTrialOffer = offer;
            if (!hasFreeTrial && firstStandardOffer == null) firstStandardOffer = offer;

            if (!cleanTag.isEmpty() && offer.getOfferTags() != null && offer.getOfferTags().contains(cleanTag)) {
                return offer.getOfferToken();
            }
        }

        if (preferFreeTrial && firstFreeTrialOffer != null) return firstFreeTrialOffer.getOfferToken();
        if (firstStandardOffer != null) return firstStandardOffer.getOfferToken();
        if (firstFreeTrialOffer != null) return firstFreeTrialOffer.getOfferToken();
        return firstMatchingBasePlan != null ? firstMatchingBasePlan.getOfferToken() : null;
    }

    private boolean hasFreeTrialPhase(ProductDetails.SubscriptionOfferDetails offer) {
        if (offer == null || offer.getPricingPhases() == null || offer.getPricingPhases().getPricingPhaseList() == null) return false;
        for (ProductDetails.PricingPhase phase : offer.getPricingPhases().getPricingPhaseList()) {
            if (phase != null && phase.getPriceAmountMicros() == 0L) {
                return true;
            }
        }
        return false;
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) return;

        int response = billingResult.getResponseCode();
        if (response == BillingClient.BillingResponseCode.USER_CANCELED) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("cancelled", true);
            result.put("message", "Acquisto annullato.");
            pendingPurchaseCall.resolve(result);
            clearPending();
            return;
        }

        if (response != BillingClient.BillingResponseCode.OK) {
            pendingPurchaseCall.reject("Acquisto non riuscito: " + billingResult.getDebugMessage());
            clearPending();
            return;
        }

        if (purchases == null || purchases.isEmpty()) {
            pendingPurchaseCall.reject("Nessun acquisto restituito da Google Play.");
            clearPending();
            return;
        }

        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                acknowledgeIfNeeded(purchase);
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("plan", pendingPlan);
                result.put("productId", pendingProductId);
                result.put("basePlanId", pendingBasePlanId);
                result.put("purchaseToken", purchase.getPurchaseToken());
                pendingPurchaseCall.resolve(result);
                clearPending();
                return;
            }
        }

        JSObject result = new JSObject();
        result.put("success", false);
        result.put("pending", true);
        result.put("message", "Acquisto in attesa di conferma.");
        pendingPurchaseCall.resolve(result);
        clearPending();
    }

    private void acknowledgeIfNeeded(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
        billingClient.acknowledgePurchase(params, billingResult -> Log.d(TAG, "acknowledge result: " + billingResult.getResponseCode()));
    }

    private JSObject resolvePlanFromPurchases(List<Purchase> purchases) {
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("hasActiveSubscription", false);
        result.put("plan", "free");

        if (purchases == null || purchases.isEmpty()) return result;

        Map<String, String> productToPlan = new HashMap<>();
        productToPlan.put("base", "base");
        productToPlan.put("complete", "premium");

        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
            List<String> products = purchase.getProducts();
            for (String productId : products) {
                if (productToPlan.containsKey(productId)) {
                    acknowledgeIfNeeded(purchase);
                    result.put("hasActiveSubscription", true);
                    result.put("plan", productToPlan.get(productId));
                    result.put("productId", productId);
                    result.put("purchaseToken", purchase.getPurchaseToken());
                    return result;
                }
            }
        }
        return result;
    }

    private void clearPending() {
        pendingPurchaseCall = null;
        pendingPlan = null;
        pendingProductId = null;
        pendingBasePlanId = null;
    }
}

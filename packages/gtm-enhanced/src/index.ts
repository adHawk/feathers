"use strict";

/**
 * Module dependencies.
 */

const integration = require("@segment/analytics.js-integration");
const push = require("global-queue")("dataLayer", { wrap: false });
const dot = require("obj-case");
// const forEach = require("lodash.foreach");
const pick = require("lodash.pick");

/**
 * Expose `GTM`.
 */
const EnhancedGTM = integration("Google Tag Manager")
  .global("dataLayer")
  .global("google_tag_manager")
  .option("containerId", "")
  .option("environment", "")
  .option("dimensions", {})
  .option("trackNamedPages", true)
  .option("trackCategorizedPages", true)
  .tag(
    "no-env",
    '<script src="//www.googletagmanager.com/gtm.js?id={{ containerId }}&l=dataLayer">',
  )
  .tag(
    "with-env",
    '<script src="//www.googletagmanager.com/gtm.js?id={{ containerId }}&l=dataLayer&gtm_preview={{ environment }}">',
  );

/**
 * Initialize.
 *
 * https://developers.google.com/tag-manager
 *
 * @api public
 */

EnhancedGTM.prototype.initialize = function() {
  if (process.env.NODE_ENV === "test") {
    this.ready();
  } else {
    push({ "gtm.start": Number(new Date()), event: "gtm.js" });

    if (this.options.environment.length) {
      this.load("with-env", this.options, this.ready);
    } else {
      this.load("no-env", this.options, this.ready);
    }
  }
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */
EnhancedGTM.prototype.loaded = function() {
  if (process.env.NODE_ENV === "test") {
    return !!window["dataLayer"];
  }

  return !!(
    window["dataLayer"] && Array.prototype.push !== window["dataLayer"].push
  );
};

/**
 * Page.
 *
 * @api public
 * @param {Page} page
 */

EnhancedGTM.prototype.page = function(page: any) {
  const category = page.category();
  const name = page.fullName();
  const opts = this.options;

  // all
  if (opts.trackAllPages) {
    this.track(page.track());
  }

  // categorized
  if (category && opts.trackCategorizedPages) {
    this.track(page.track(category));
  }

  // named
  if (name && opts.trackNamedPages) {
    this.track(page.track(name));
  }
};

/**
 * Track.
 *
 * https://developers.google.com/tag-manager/devguide#events
 *
 * @api public
 * @param {Track} track
 */
EnhancedGTM.prototype.track = function(track: any) {
  const props = track.properties();
  props.event = track.event();

  push({ ...enhancedUserInfo(this.analytics, this.options), ...props });
};

/**
 * Product Clicked.
 *
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#product-data
 *
 * @api public
 * @param {Track} track
 */
EnhancedGTM.prototype.productClicked = function(track: any) {
  const userProps = enhancedUserInfo(this.analytics, this.options);
  const click = enhancedEcommerceTrackProduct(track, this.options);

  push({
    ...userProps,
    event: "productClick",
    ecommerce: {
      click: click,
    },
  });
};

function enhancedUserInfo(analytics: any, opts: any) {
  const userId = analytics.user().id();
  const anonymousId = analytics.user().anonymousId();
  const userProps: any = {};
  const customDimensions = pick(
    analytics.user().traits(),
    opts.extraDimensions,
  );

  if (userId) userProps.userId = userId;
  if (anonymousId) userProps.segmentAnonymousId = anonymousId;

  return { ...customDimensions, ...userProps };
}

function enhancedEcommerceTrackProduct(track: any, opts: any) {
  const props = track.properties();
  const product: any = {
    id: track.productId() || track.id() || track.sku(),
    name: track.name(),
    category: track.category(),
    quantity: track.quantity(),
    price: track.price(),
    brand: props.brand,
    variant: props.variant,
    currency: track.currency(),
  };

  // https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#product-data
  // GA requires an integer but our specs says "Number", so it could be a float.
  if (props.position != null) {
    product.position = Math.round(props.position);
  }

  // append coupon if it set
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#measuring-transactions
  const coupon = track.proxy("properties.coupon");
  if (coupon) product.coupon = coupon;

  return product;
}

module.exports = EnhancedGTM;

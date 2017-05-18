/**
 * File Information
 * =============================================================================
 * @overview  Kargo Module Template
 * @version   1.0.0
 * @author    Index Exchange
 * @copyright Copyright (C) 2016 Index Exchange All Rights Reserved.
 *
 * The information contained within this document is confidential, copyrighted
 * and or a trade secret. No part of this document may be reproduced or
 * distributed in any form or by any means, in whole or in part, without the
 * prior written permission of Index Exchange.
 * -----------------------------------------------------------------------------
 */

window.headertag.partnerScopes.push(function() {
    'use strict';

    // === KARGO ===============================================================
    function readCookie(name) {
        var nameEquals = name + '=',
            cookies = document.cookie.split(';'),
            i, cookie;

        for (i in cookies) {
            cookie = cookies[i];

            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1, cookie.length);
            }

            if (cookie.indexOf(nameEquals) === 0) {
                return cookie.substring(nameEquals.length, cookie.length);
            }
        }

        return null;
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
    function objectAssign(target, varArgs) { // .length of function is 2
        'use strict';
        if (target == null) { // TypeError if undefined or null
            throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];

            if (nextSource != null) { // Skip over if undefined or null
                for (var nextKey in nextSource) {
                    // Avoid bugs when hasOwnProperty is shadowed
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }

        return to;
    };

    function compact(arr) {
        var newArr = [];

        for (var i = 0; i < arr.length; i++) {
            if (arr[i]) {
                newArr.push(arr[i]);
            }
        }

        return newArr;
    }

    function checkRequired(obj, key, fn) {
        if (!fn || !Utils.isFunction(fn)) {
            err.push('Invalid check function in config validation');
            return false;
        }

        if (!obj.hasOwnProperty(key) || !fn(obj[key])) {
            err.push('Invalid config property or subproperty: ' + key);
            return false;
        }

        return true;
    }

    function getKrakenParamsFromConfig(config) {
        return {
            "timeout": window.headertagconfig.timeout
        };
    }

    function getEncodedCrb() {
        try {
            var crb = JSON.parse(decodeURIComponent(readCookie('krg_crb'))),
                syncIds = {};

            if (crb && crb.v) {
                var vParsed = JSON.parse(atob(crb.v));

                if (vParsed && vParsed.syncIds) {
                    syncIds = vParsed.syncIds;
                }
            }

            return btoa(JSON.stringify(syncIds));
        }
        catch (e) {
            return '';
        }
    }

    function getEncodedKid() {
        try {
            var uid = JSON.parse(decodeURIComponent(readCookie('krg_uid'))),
                vData = {};

            if (uid && uid.v) {
                vData = uid.v;
            }

            return btoa(JSON.stringify(vData));
        }
        catch (e) {
            return '';
        }
    }

    function getKargoIds() {
        return {
            crb: getEncodedCrb(),
            kid: getEncodedKid()
        };
    }

    function getAllMetadata() {
        return {
            kargoIDs: getKargoIds()
        };
    }

    function getAdSlotIds(slotIds, config) {
        return {
            adSlotIDs: compact(slotIds.map(function (slotId) {
                if (config.mapping.hasOwnProperty(slotId) && config.mapping[slotId].length) {
                    var xSlotKey = config.mapping[slotId][0];

                    if (config.xSlots.hasOwnProperty(xSlotKey)) {
                        return config.xSlots[xSlotKey].adSlotId;
                    }
                }

                return null;
            }))
        };
    }

    function getBidTransformConfig(adSlot) {
        var floor = 0,
            buckets = [];

        if (adSlot && adSlot.pricing) {
            if (adSlot.pricing.floor) {
                floor = adSlot.pricing.floor;
            }

            if (adSlot.pricing.buckets) {
                buckets = adSlot.pricing.buckets;
            }
        }

        return {
            floor: floor,
            inputCentsMultiplier: 100,
            outputCentsDivisor: 100,
            outputPrecision: 2,
            roundingType: 1,
            buckets: buckets
        };
    }

    function krakenRequest(params, callback, failureCallback) {
        var KRAKEN_HOST = Utils.getProtocol() + '//krk.kargo.com';

        Network.ajax({
            url: KRAKEN_HOST + '/api/v1/bid?json=' + params,
            method: 'GET',
            partnerId: PARTNER_ID,
            jsonp: true,
            withCredentials: true,
            onSuccess: function(responseText) {
                try {
                    callback(JSON.parse(responseText));
                }
                catch (e) {
                    failureCallback();
                }
            },
            onFailure: failureCallback
        });
    }
    // === END KARGO ===========================================================

    /* =============================================================================
     * SECTION A | Configure Module Name and Feature Support
     * -----------------------------------------------------------------------------
     *
     * Configure all of the following settings for this module.
     *
     * PARTNER_ID:
     *     Three or four character partner ID provided by Index Exchange.
     *
     * SUPPORTED_TARGETING_TYPES:
     *     The types of targeting that are supported by this module.
     *
     *          - page: targeting is set on the page as a whole.
     *          - slot: targeting is set on each slot individually.
     *
     * SUPPORTED_ANALYTICS:
     *     The types of analytics the wrapper should support for this module.
     *
     *          - time:   time between when this module's getDemand function is
     *                    called, and when it returns its retrieved demand.
     *          - demand: the targeting information returned from this module.
     *
     */

    var PARTNER_ID = 'KARG';

    var SUPPORTED_TARGETING_TYPES = {
        page: false,
        slot: true
    };

    var SUPPORTED_ANALYTICS = {
        time: true,
        demand: true
    };

    var SUPPORTED_OPTIONS = {};

    /* -------------------------------------------------------------------------- */

    var Utils = window.headertag.Utils;
    var Network = window.headertag.Network;
    var BidRoundingTransformer = window.headertag.BidRoundingTransformer;

    function validateTargetingType(tt) {
        return typeof tt === 'string' && SUPPORTED_TARGETING_TYPES[tt];
    }

    function init(config, callback) {
        //? if (DEBUG) {
        var err = [];

        if (!config.hasOwnProperty('targetingType') || !validateTargetingType(config.targetingType)) {
            err.push('targetingType either not provided or invalid.');
        }

        /* =============================================================================
         * SECTION B | Validate Module-Specific Configurations
         * -----------------------------------------------------------------------------
         *
         * Validate all the module-specific parameters in the `config` object.
         * Validation functions have been provided in the `Utils` object for
         * convenience. See ../lib/utils.js for more information.
         *
         * For required configurations use:
         *
         *     if (!config.hasOwnProperty(<parameter>) || ... || ...) {
         *         err.push(<error message>);
         *     }
         *
         * For optional configurations use:
         *
         *     if (config.hasOwnProperty(<parameters>)  && (... || ...)) {
         *         err.push(<error message>);
         *     }
         *
         */

        /* PUT CODE HERE */

        // === KARGO =======================================================
        (function kargoConfigValidation() {
            // TODO what is already validated in the config and are we over-validating in this function?
            if (!Utils.isObject(config)) {
                err.push('Config object invalid');
            }
            else {
                // TODO what is optional and what is required?
                var validity = checkRequired(config, 'disabled', Utils.isBoolean) &&
                               checkRequired(config, 'targetingType', Utils.isString) &&
                               checkRequired(config, 'timeout', Utils.isInteger) &&
                               checkRequired(config, 'mapping', Utils.isObject) &&
                               checkRequired(config, 'xSlots', Utils.isObject);

                if (validity) {
                    for (var key in config.mapping) {
                        if(!config.mapping.hasOwnProperty(key)){
                            continue;
                        }

                        var isArray = checkRequired(config.mapping, key, Utils.isArray);

                        if (isArray) {
                            for (var i = 0; i < config.mapping[key].length; i++) {
                                var isValidXSlotType = checkRequired(config.mapping[key], i, Utils.isString);

                                if (isValidXSlotType && !config.xSlots.hasOwnProperty(config.mapping[key][i])) {
                                    err.push('Invalid xSlot reference in mapping');
                                }
                            }
                        }
                    }
                }
            }
        })();
        // === END KARGO ====================================================

        /* -------------------------------------------------------------------------- */

        var xSlotConfigValid = true;

        if (!config.hasOwnProperty('xSlots') || typeof config.xSlots !== 'object' || Utils.isArray(config.xSlots)) {
            err.push('xSlots either not provided or invalid.');
            xSlotConfigValid = false;
        } else {
            for(var xSlotName in config.xSlots){
                if(!config.xSlots.hasOwnProperty(xSlotName)){
                    continue;
                }

        /* =============================================================================
         * SECTION C | Validate Partner Slot Configurations
         * -----------------------------------------------------------------------------
         *
         * Validate the specific configurations that must appear in each xSlot.
         * Validation functions have been provided in the `Utils` object for
         * convenience. See ../lib/utils.js for more information.
         *
         * For required configurations use:
         *
         *     if (!config.hasOwnProperty(<parameter>) || ... || ...) {
         *         err.push(<error message>);
         *     }
         *
         * For optional configurations use:
         *
         *     if (config.hasOwnProperty(<parameters>)  && (... || ...)) {
         *         err.push(<error message>);
         *     }
         *
         */

        /* PUT CODE HERE */

        // === KARGO =======================================================
        (function kargoSlotValidation() {
            // TODO we need to make sure we have filled out xSlot config properly
            checkRequired(config.xSlots[xSlotName], 'adSlotId', Utils.isString);
        })();
        // === END KARGO ====================================================

        /* -------------------------------------------------------------------------- */

            }
        }

        if (!config.hasOwnProperty('mapping') || typeof config.xSlots !== 'object' || Utils.isArray(config.xSlots)) {
            err.push('mapping either not provided or invalid.');
        } else {
            var seenXSlots = {};

            for(var htSlotName in config.mapping){
                if(!config.mapping.hasOwnProperty(htSlotName)){
                    continue;
                }

                var htSlotMapping = config.mapping[htSlotName];

                if(!Utils.isArray(htSlotMapping) || !htSlotMapping.length){
                    err.push('slot mappings missing or invalid for htSlot ' + htSlotName);
                } else {
                    for(var k = 0; k < htSlotMapping.length; k++){
                        if(!Utils.validateNonEmptyString(htSlotMapping[k])){
                            err.push('slot mappings missing or invalid for htSlot ' + htSlotName);
                        } else if(xSlotConfigValid){
                            if(config.xSlots.hasOwnProperty(htSlotMapping[k])){
                                if(seenXSlots.hasOwnProperty(htSlotMapping[k])){
                                    err.push('xSlot ' + htSlotMapping[k] + ' mapped multiple times in ' + PARTNER_ID +' config');
                                } else {
                                    seenXSlots[htSlotMapping[k]] = true;
                                }
                            } else {
                                err.push('invalid xSlot ' + htSlotMapping[k] + ' in mapping for htSlot ' + htSlotName);
                            }
                        }
                    }
                }
            }
        }

        if (config.hasOwnProperty('targetKeyOverride')) {
            if (!Utils.validateNonEmptyObject(config.targetKeyOverride)) {
                err.push('targetKeyOverride must be a non-empty object');
            } else {
                if (config.targetKeyOverride.omKey && !Utils.validateNonEmptyString(config.targetKeyOverride.omKey)) {
                    err.push('targetKeyOverride.omKey must be a non-empty string');
                }

                if (config.targetKeyOverride.pmKey && !Utils.validateNonEmptyString(config.targetKeyOverride.pmKey)) {
                    err.push('targetKeyOverride.pmKey must be a non-empty string');
                }

                if (config.targetKeyOverride.idKey && !Utils.validateNonEmptyString(config.targetKeyOverride.idKey)) {
                    err.push('targetKeyOverride.idKey must be a non-empty string');
                }
            }
        }

        if(config.hasOwnProperty('roundingBuckets')){
            if (!Utils.validateNonEmptyObject(config.roundingBuckets)) {
                err.push('roundingBuckets must be a non-empty object');
            } else {
                var rConf = config.roundingBuckets;
                if(rConf.floor && (typeof rConf.floor !== 'number' || rConf.floor < 0)){
                    err.push('roundingBuckets.floor must be a non-negative number');
                }
                if(rConf.inputCentsMultiplier && (typeof rConf.inputCentsMultiplier !== 'number' || rConf.inputCentsMultiplier < 0)){
                    err.push('roundingBuckets.floor must be a non-negative number');
                }
                if(rConf.outputCentsDivisor && (typeof rConf.outputCentsDivisor !== 'number' || rConf.outputCentsDivisor < 0)){
                    err.push('roundingBuckets.floor must be a non-negative number');
                }
                if(rConf.outputPrecision && !Utils.validateInteger(rConf.outputPrecision)){
                    err.push('roundingBuckets.outputPrecision must be an integer');
                }
                if(rConf.roundingType && !Utils.validateInteger(rConf.roundingType, 0, 3)){
                    err.push('roundingBuckets.roundingType must be a valid rounding type');
                }
                if(rConf.buckets && (!Utils.isArray(rConf.buckets) || rConf.buckets.length === 0)){
                    err.push('roundingBuckets.buckets must be an array');
                } else {
                    for(var l = 0; l < rConf.buckets.length; l++){
                        if(!Utils.validateNonEmptyObject(rConf.buckets[l])){
                            err.push('roundingBuckets.buckets must contain non-empty objects');
                            break;
                        }
                    }
                }
            }
        }

        if (err.length) {
            callback(err);
            return;
        }

        //? }

        var kargoBidder = new Partner(config);
        window.headertag[PARTNER_ID] = window.headertag[PARTNER_ID] || {};
        window.headertag[PARTNER_ID].callback = kargoBidder.responseCallback;
        window.headertag[PARTNER_ID].render = kargoBidder.renderAd;

        callback(null, kargoBidder);
    }

    function Partner(config) {
        var _this = this;

        var targetingType = config.targetingType;
        var supportedAnalytics = SUPPORTED_ANALYTICS;
        var supportedOptions = SUPPORTED_OPTIONS;
        
        var creativeStore = {};

        /* =============================================================================
         * Set default targeting keys to be used for DFP. Values for omKey and idKey are
         * mandatory. pmKey is only necessary if the partner will use a private market
         * (deals).
         *
         * Standard values are:
         *
         * omKey: ix_(PARTNER ID)_om
         * pmKey: ix_(PARTNER ID)_pm
         * idKey: ix_(PARTNER ID)_id
         */
        var targetingKeys = {
            omKey: 'ix_karg_om',
            pmKey: 'ix_karg_pm',
            idKey: 'ix_karg_id',
            pmidKey: 'ix_karg_pmid'
        };

        if (config.targetKeyOverride) {
            if (config.targetKeyOverride.omKey) {
                targetingKeys.omKey = config.targetKeyOverride.omKey;
            }

            if (config.targetKeyOverride.idKey) {
                targetingKeys.idKey = config.targetKeyOverride.idKey;
            }

            if (config.targetKeyOverride.pmKey) {
                targetingKeys.pmKey = config.targetKeyOverride.pmKey;
            }

            if (config.targetKeyOverride.pmidKey) {
                targetingKeys.pmidKey = config.targetKeyOverride.pmidKey;
            }
        }

        var bidTransformer;

        /* =============================================================================
         * Set the default parameters for interpreting the prices sent by the bidder
         * endpoint. The bid transformer library uses cents internally, so this object
         * specifies how to transform to and from the units provided by the bidder
         * endpoint and expected by the DFP line item targeting. See
         * bid-rounding-transformer.js for more information.
         */
        var bidTransformConfig = {          // Default rounding configuration
            "floor": 0,                     // Minimum acceptable bid price
            "inputCentsMultiplier": 100,    // Multiply input bids by this to get cents
            "outputCentsDivisor": 100,      // Divide output bids in cents by this
            "outputPrecision": 2,           // Decimal places in output
            "roundingType": 1,              // Rounding method (1 is floor)
            "buckets": [{                   // Buckets specifying rounding steps
                "max": 2000,                // Maximum number of cents for this bucket
                "step": 5                   // Increments for this bucket in cents
            }, {
                "max": 5000,                // Maximum number of cents for this bucket
                "step": 100                 // Increments for this bucket in cents
            }]
        };

        if(config.roundingBuckets){
            bidTransformConfig = config.roundingBuckets;
        }

        /* =============================================================================
         * Use the bidTransformer object to round bids received from the partner
         * endpoint. Usage:
         *
         * var roundedBid = bidTransformer.transformBid(rawBid);
         */
        bidTransformer = BidRoundingTransformer(bidTransformConfig);

        /* =============================================================================
         * SECTION E | Copy over the Configurations to Internal Variables
         * -----------------------------------------------------------------------------
         *
         * Assign all the required values from the `config` object to internal
         * variables. These values do not need to be validated here as they have already
         * been validated in `init`.
         *
         * Example:
         *
         *      var <internal parameter> = config.<corresponding parameter>;
         */

        /* PUT CODE HERE */

        /* -------------------------------------------------------------------------- */

        // TODO this should maybe be handled inside of Kraken rather than transformed on the fly
        function transformAdSlotToDemand(config, adSlots, targetingKeys) {
            var demand = {slot: {}},
                idMap = {};

            for (var xSlotKey in config.xSlots) {
                for (var mappingKey in config.mapping) {
                    idMap[config.xSlots[config.mapping[mappingKey][0]].adSlotId] = mappingKey;
                }
            }

            for (var adSlotId in adSlots) {
                var adSlot = adSlots[adSlotId],
                    targeting = adSlot.targetingPrefix + bidTransformer.transformBid(adSlot.cpm),
                    demandConfig = {};

                demandConfig[targetingKeys.idKey] = adSlotId;

                if (adSlot.targetingCustom) {
                    demandConfig[targetingKeys.pmKey] = targeting;
                    demandConfig[targetingKeys.pmidKey] = adSlot.targetingCustom;
                }
                else {
                    demandConfig[targetingKeys.omKey] = targeting;
                }

                demand.slot[idMap[adSlotId]] = {
                    timestamp: Utils.now(),
                    demand: demandConfig
                };
            }

            return demand;
        }

        this.getPartnerTargetingType = function getPartnerTargetingType() {
            return targetingType;
        };

        this.getSupportedAnalytics = function getSupportedAnalytics() {
            return supportedAnalytics;
        };

        this.getSupportedOptions = function getSupportedOptions() {
            return supportedOptions;
        };

        this.setPartnerTargetingType = function setPartnerTargetingType(tt) {
            if (!validateTargetingType(tt)) {
                return false;
            }

            targetingType = tt;

            return true;
        };

        this.getDemand = function getDemand(correlator, slots, callback) {

            /* =============================================================================
             * SECTION H | Return Demand from the Module's Ad Server
             * -----------------------------------------------------------------------------
             *
             * The `slots` argument is an array of HeaderTagSlot objects for which demand
             * is requested. Call the getSlotElementId function on these objects to obtain
             * their IDs to look up in the mapping object of the config.
             *
             * Make a request to the module's ad server to get demand. If there is an error
             * while doing so, then call `callback` as such:
             *
             *      callback(err);
             *
             * where `err` is a descriptive error message.
             *
             * If there are no errors, and demand is returned from the ad servers, call
             * `callback` as such:
             *
             *      callback(null, demand);
             *
             * where `demand` is an object containing the slot-level demand in the following
             * format:
             *
             *     {
             *         slot: {
             *             <htSlotId>: {
             *                 timestamp: Utils.now(),
             *                 demand: {
             *                     <key>: <value>,
             *                     <key>: <value>,
             *                     ...
             *                 }
             *             },
             *             ...
             *         }
             *     }
             */

            /* PUT CODE HERE */
            // === KARGO =======================================================
            (function kargoGetDemand() {
                var params = objectAssign(
                        {},
                        getKrakenParamsFromConfig(config),
                        getAdSlotIds(slots.map(function(slot) { return slot.getSlotElementId() }), config),
                        getAllMetadata()
                    ),
                    successCallback = function(adSlots) {
                        var demand = transformAdSlotToDemand(config, adSlots, targetingKeys);

                        callback(null, demand);
                        _this.responseCallback(adSlots);
                    },
                    encodedParams = encodeURIComponent(JSON.stringify(params)),
                    failureCallback = function() {
                        callback('Request to Kargo Kraken failed');
                    };

                if(params.adSlotIDs.length) {
                    krakenRequest(encodedParams, successCallback, failureCallback);
                }
                else {
                    callback('No kargo slots!');
                }
            })();
            // === END KARGO ===================================================

            /* -------------------------------------------------------------------------- */
        };

        this.responseCallback = function(adSlots){
            /* =============================================================================
             * SECTION I | Parse Demand from the Module's Ad Server
             * -----------------------------------------------------------------------------
             *
             * Run this function as a callback when the ad server responds with demand.
             * Store creatives and demand in global objects as needed for processing.
             */

            /* PUT CODE HERE */

            // === KARGO =======================================================
            (function kargoResponseCallback() {
                for (var adSlotId in adSlots) {
                    var adSlot = adSlots[adSlotId];
                    creativeStore[adSlotId] = creativeStore[adSlotId] || {};
                    creativeStore[adSlotId][adSlot.targetingPrefix.split('_')[0]] = adSlot.adm;
                }
            })();
            // === END KARGO ===================================================

            /* -------------------------------------------------------------------------- */
        };

        this.renderAd = function(doc, targetingMap, width, height) {
            /* =============================================================================
             * SECTION J | Render function
             * -----------------------------------------------------------------------------
             *
             * This function will be called by the DFP creative to render the ad. It should
             * work as-is, but additions may be necessary here if there beacons, tracking
             * pixels etc. that need to be called as well.
             */

            if (doc && targetingMap && width && height) {
                try {
                    var id = targetingMap[targetingKeys.idKey];

                    var sizeKey = width + 'x' + height;
                    if (window.headertag.sizeRetargeting && window.headertag.sizeRetargeting[sizeKey]){
                        width = window.headertag.sizeRetargeting[sizeKey][0];
                        height = window.headertag.sizeRetargeting[sizeKey][1];
                    }

                    var creative = creativeStore[id][width + 'x' + height];

                    doc.write(creative);
                    doc.close();
                    if (doc.defaultView && doc.defaultView.frameElement) {
                        doc.defaultView.frameElement.width = width;
                        doc.defaultView.frameElement.height = height;
                    }
                } catch (e){
                    //? if (DEBUG)
                    console.log('Error trying to write ' + PARTNER_ID + ' ad to the page');
                }

            }
        };
    }

    window.headertag.registerPartner(PARTNER_ID, init);
});

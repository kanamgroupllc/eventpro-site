package com.accessplus.eventpro.core.security;

/**
 * Internal request markers used by the security filter chain.
 */
public final class CsrfRequestAttributes {

    public static final String API_KEY_AUTHENTICATED =
            CsrfRequestAttributes.class.getName() + ".API_KEY_AUTHENTICATED";

    public static final String MOBILE_CLIENT_HEADER = "X-EventPro-Client";
    public static final String MOBILE_CLIENT_VALUE = "mobile";

    private CsrfRequestAttributes() {
    }
}

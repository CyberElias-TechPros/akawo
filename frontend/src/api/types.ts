/* TypeScript shapes for the Akawo Worker API responses. */

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerified: boolean;
    isVerified: boolean;
    role: 'user' | 'admin';
    status: 'active' | 'suspended';
    createdAt: string;
    lastLoginAt: string | null;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface Dashboard {
    user: User;
    summary: {
        totalContributed: number;
        pendingAmount: number;
        paidCount: number;
        pendingCount: number;
        monthlyTotal: number;
    };
    nextContribution: {
        id: string;
        amount: number;
        dueDate: string | null;
        label: string | null;
        overdue: boolean;
    } | null;
    recentContributions: Contribution[];
    recentPayments: Payment[];
    unreadNotifications: number;
    proofsAwaitingReview: number;
    verification: { isVerified: boolean; emailVerified: boolean };
}

export interface Contribution {
    id: string;
    amount: number;
    label: string | null;
    frequency: 'once' | 'monthly';
    status: 'pending' | 'paid' | 'failed' | 'cancelled';
    dueDate: string | null;
    paidAt: string | null;
    createdAt: string;
    updatedAt: string;
    overdue: boolean;
}

export interface Payment {
    id: string;
    contributionId: string;
    amount: number;
    currency: string;
    gateway: string;
    gatewayReference: string | null;
    status: 'pending' | 'pending_verification' | 'completed' | 'failed';
    proofStatus: 'unreviewed' | 'approved' | 'rejected' | null;
    proofNote: string | null;
    failureReason: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    label?: string | null;
}

export interface VerificationRecord {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    faceMeta: Record<string, unknown> | null;
    livenessMeta: Record<string, unknown> | null;
    rejectReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

/** The user's own latest verification, including their signed media. */
export interface MyVerification extends VerificationRecord {
    media: { face: string; liveness: string } | null;
}

export interface NotificationItem {
    id: string;
    type: string;
    title: string;
    body: string;
    readAt: string | null;
    createdAt: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/** Admin view of a user (adds masked BVN tail; /auth/me never exposes it). */
export interface AdminUser extends User {
    bvnLast4: string;
}

/* ------------------------------- admin ------------------------------- */

export interface AdminStats {
    users: { total: number; verified: number; pendingKyc: number; emailUnverified: number };
    contributions: { count: number; total: number; pending: number };
    payments: {
        completed: number;
        completedTotal: number;
        pending: number;
        pendingTotal: number;
        failed: number;
    };
    verifications: { pending: number; approved: number; rejected: number };
    recentPayments: Array<{
        id: string;
        amount: number;
        status: string;
        createdAt: string;
        name: string;
        email: string;
    }>;
    topContributors: Array<{ name: string; total: number }>;
    monthly: Array<{ month: string; total: number }>;
}

export interface AdminVerificationQueueItem {
    id: string;
    userId: string;
    status: string;
    createdAt: string;
    user: { name: string; email: string; phone: string | null; bvnLast4: string };
}

export interface AdminVerificationDetail {
    verification: {
        id: string;
        status: string;
        faceMeta: Record<string, unknown> | null;
        livenessMeta: Record<string, unknown> | null;
        rejectReason: string | null;
        reviewedAt: string | null;
        createdAt: string;
        updatedAt: string;
    };
    user: { name: string; email: string; phone: string | null; bvnLast4: string };
    media: { face: string; liveness: string };
}

export interface AdminPaymentItem {
    id: string;
    amount: number;
    status: string;
    gateway: string;
    proofStatus: string | null;
    label: string | null;
    createdAt: string;
    completedAt: string | null;
    user: { name: string; email: string } | null;
}

export interface AdminEmailItem {
    id: string;
    to: string;
    subject: string;
    body: string;
    createdAt: string;
}

export interface AdminAuditEntry {
    id: string;
    actor: string;
    action: string;
    entity: string | null;
    entityId: string | null;
    meta: Record<string, unknown> | null;
    createdAt: string;
}

export interface AppConfig {
    appName: string;
    currency: string;
    gatewayMode: 'mock' | 'paystack';
    faceMode: 'manual' | 'api';
    minContribution: number;
    maxContribution: number;
}

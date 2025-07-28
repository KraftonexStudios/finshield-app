// Firebase User interface
export interface FirebaseUser {
  uid: string;
  mobile: string;
  fullName: string;
  emailId: string;
  age: number;
  gender: string;
  profile?: string;
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  balance: number;
  // Security
  pinHash?: string;
  recoveryQuestions: {
    question: string;
    answerHash: string;
  }[];
  biometricEnabled: boolean;
  biometricType?: "face" | "fingerprint";
  // Metadata
  createdAt: any;
  updatedAt: any;
  isActive: boolean;
  lastLoginAt?: any;
  // Notification
  fcmToken?: string;
}

// Firebase Transaction interface
export interface FirebaseTransaction {
  id?: string;
  fromUserId: string;
  toUserId?: string;
  fromMobile: string;
  toMobile?: string;
  type: "credit" | "debit" | "transfer";
  amount: number;
  description: string;
  note?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  reference: string;
  createdAt: any;
  updatedAt: any;
  // Additional fields for different transaction types
  category?: "transfer" | "bill_payment" | "recharge" | "qr_payment";
  recipient?: {
    name: string;
    mobile: string;
    accountNumber?: string;
  };
}

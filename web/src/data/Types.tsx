export type UserType = 'admin' | 'user' | 'guest';

export interface Guest {
    id: number;
    email: string;
    invited_date: string | null;
    accepted_date: string | null;
    attended_date: string | null;
    invitation_code?: string;
    [key: string]: any;
}

export interface Sponsor {
    id: number;
    name: string;
    description: string;
    logo: string;
    url: string;
    contact: string;
    contact_email: string;
    contact_phone: string;
    country: string;
}
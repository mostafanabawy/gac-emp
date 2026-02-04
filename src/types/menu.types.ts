// TypeScript types for the response structure

export type MenuItem = {
    id: number;
    TitleAr: string;
    TitleEn: string;
    itemId: number;
    Icon: string;
    ItemOrderID: number;
    PositionID: number;
    PositionName: string;
    ItemURL: string;
    IsDefaultItem: boolean;
    MenuStyleID: number;
    MenuStyle: string;
    ItemLevel: number;
    parentId?: number;
    children?: MenuItem[];
    ServiceID?: number;
};

export type Result = {
    result: string;
    details: string;
};

export type GetMenuApiResponse = {
    result: Result;
    MenuUI: MenuItem[];
};

import {StockCommandSchema} from './stock.ts';
import {E621CommandSchema} from './booru.ts';
import {FrinkiacCommandSchema} from './frinkiac.ts';
import {IsThisSchema} from './isthis.ts';
import {RedditCommandSchema} from './reddit.ts';
import {NFLCommandSchema} from './nfl.ts';

export const GlobalCommandSchemas = [
    StockCommandSchema,
    E621CommandSchema,
    FrinkiacCommandSchema,
    IsThisSchema,
    RedditCommandSchema,
    NFLCommandSchema,
];
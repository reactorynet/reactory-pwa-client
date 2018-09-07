import plc from './plc';
import towerstone from './towerstone';
import woosparks from './woosparks';
import aot from './aot';

export const StyleHelper = {
    debug: () => ({ outline:'1px solid red' }),
    height: (size = 0, unit = 'px') => ({ height: `${size}${unit}`}),
    lrPadding: (size = 0, unit = 'px') => ({ paddingLeft: `${size}${unit}`, paddingRight: `${size}${unit}` })
};
export const plcTheme = plc;
export const towerstoneTheme = towerstone;
export const woosparksTheme = woosparks;
export const getTheme = (themeName) => {
    switch(themeName){
        case 'aot': {
            return aot
        }
        case 'woosparks': {
            return woosparks
        }        
        case 'plc': {
            return plc
        }
        case 'towerstone':        
        default: {
            return towerstone
        }
    }
};
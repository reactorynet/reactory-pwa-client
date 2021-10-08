const defaultInstructions = {
    MY_SPACE:{
      title: 'A. My Space',
      description: 'for individual belonging and growth in the organisation.'
    },
    MY_TEAM:{
      title: 'B. My Team',
      description: 'levels of communication and trust within and between teams.'
    },
    OUR_CULTURE:{
        title: 'C. Our Culture',
        description: 'for shared values and behaviours for the organisation.'
      },
      OUR_RESULTS:{
        title: 'D. Our Results',
        description: 'the drive to achieve and exceed targets.'
      },
      OUR_GROWTH:{
        title: 'E. Our Growth',
        description: 'the capacity to question, innovate and take risks.'
      },
      OUR_PURPOSE:{
        title: 'F. Our Purpose',
        description: 'alignment to the big picture: strategy and purpose.'
      },  
}

export default (behaviour)=>{
    const _behaviour = behaviour.replace(/ /g, '_').toUpperCase()
    return defaultInstructions[_behaviour]
}
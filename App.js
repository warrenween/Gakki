import { createAppContainer, createStackNavigator } from 'react-navigation'
import Main from './src/Main'
// 禁用所有黄色警告
console.disableYellowBox = true

const stack = createStackNavigator(
  {
    SignedIn: Main
  },
  {
    initialRouteName: 'SignedIn',
    headerMode: 'none'
  }
)

export default createAppContainer(stack)

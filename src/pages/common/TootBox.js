import React, { Component } from 'react'
import {
  View,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity,
  Clipboard
} from 'react-native'
import Icon from 'react-native-vector-icons/FontAwesome5'
import {
  favourite,
  reblog,
  deleteStatuses,
  setPin,
  muteAccount,
  blockAccount
} from '../../utils/api'
import momentTimezone from 'moment-timezone'
import jstz from 'jstz'
import { RelativeTime } from 'relative-time-react-native-component'
import { zh } from '../../utils/locale'
import MediaBox from './MediaBox'
import { themeData } from '../../utils/color'
import { Menu } from 'teaset'
import mobx from '../../utils/mobx'
import { fetch } from '../../utils/store'
import HTMLView from './HTMLView'
import { observer } from 'mobx-react'

let color = {}
class TootContent extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hide: true, // CW模式隐藏敏感内容
      emojiObj: {},
      toot: {},
      isNotificationPage: false
    }
  }

  componentDidMount() {
    const props = this.props
    this.setState({
      hide: props.sensitive,
      toot: props.data,
      emojiObj: props.emojiObj,
      isNotificationPage: props.isNotificationPage
    })
  }

  componentWillReceiveProps({ data, sensitive, emojiObj, isNotificationPage }) {
    this.setState({
      toot: data,
      hide: sensitive,
      emojiObj,
      isNotificationPage
    })
  }

  render() {
    const state = this.state
    const toot = state.toot
    const hide = state.hide
    const emojiObj = state.emojiObj
    let pTagStyle = {}

    if (state.isNotificationPage) {
      pTagStyle = {
        color: color.subColor
      }
    }

    // 这里不用使用hide变量来做判断，否则会因为hide变量造成render函数的再次调用而造成错误的预期
    if (!toot.sensitive) {
      return (
        <HTMLView
          data={this.props.data.content}
          hide={hide}
          emojiObj={emojiObj}
          pTagStyle={pTagStyle}
        />
      )
    }

    return (
      <View>
        <View>
          <Text
            style={{
              color: color.contrastColor,
              fontSize: 16,
              ...pTagStyle
            }}
          >
            {toot.spoiler_text}
          </Text>
          <TouchableOpacity
            style={[styles.sensitiveSwitch, { color: color.subColor }]}
            onPress={() => this.setState({ hide: !hide })}
          >
            <Text
              style={{
                color: color.themeColor,
                textAlign: 'center'
              }}
            >
              {hide ? '显示内容' : '隐藏内容'}
            </Text>
          </TouchableOpacity>
          <HTMLView
            data={toot.content}
            hide={hide}
            emojiObj={emojiObj}
            pTagStyle={pTagStyle}
          />
        </View>
      </View>
    )
  }
}

/**
 * @description 需要考虑到普通嘟文和通知接口的嘟文两种数据格式
 */
@observer
export default class TootBox extends Component {
  static defaultProps = {
    showTread: true // 是否显示'显示前文字符'
  }

  constructor(props) {
    super(props)
    this.state = {
      timezone: jstz.determine().name(), // 获得当前用户所在的时区
      locale: zh,
      toot: null, // 嘟文数据，数据格式参考Mastodon文档
      emojiObj: {},
      isNotificationPage: false, // 当前组件是否使用在通知页面，因为通知接口返回的数据格式稍有不同
      notification: null // 存储notification接口返回的嘟文数据
    }
  }

  componentDidMount() {
    const props = this.props
    const data = props.data
    this.setState({
      toot: data.type ? data.status : data, // 有type属性，表示是Notification entity
      isNotificationPage: Boolean(data.type),
      notification: data
    })

    fetch('emojiObj').then(res => {
      if (!res) {
        return
      }
      this.setState({
        emojiObj: res
      })
    })
  }

  componentWillReceiveProps({ data }) {
    this.setState({
      toot: data.type ? data.status : data,
      isNotificationPage: Boolean(data.type),
      notification: data
    })
  }

  /**
   * @description 给toot点赞，如果已经点过赞就取消点赞
   * @param {id}: id
   * @param {favourited}: 应该点赞？
   */
  favourite = (id, favourited) => {
    favourite(id, favourited).then(() => {
      const toot = this.state.toot
      this.setState({
        toot: {
          ...toot,
          favourited: favourited,
          favourites_count: favourited
            ? toot.favourites_count + 1
            : toot.favourites_count - 1
        }
      })
    })
  }

  /**
   * @description 转发toot
   * @param {id}: id
   * @param {reblogged}: 转发状态
   */
  reblog = (id, reblogged) => {
    reblog(id, reblogged).then(res => {
      const toot = this.state.toot
      this.setState({
        toot: {
          ...toot,
          reblogged: reblogged,
          reblogs_count: reblogged
            ? toot.reblogs_count + 1
            : toot.reblogs_count - 1
        }
      })
    })
  }

  showMenu = () => {
    const toot = this.state.toot
    const getTitle = title => (
      <Text style={{ color: color.contrastColor }}>{title}</Text>
    )
    const getIcon = name => (
      <Icon name={name} style={[styles.menuIcon, { color: color.subColor }]} />
    )

    const baseItems = [
      {
        title: getTitle('分享'),
        icon: getIcon('share'),
        onPress: () => alert('分享功能正在实现哦～')
      },
      {
        title: getTitle('复制链接'),
        icon: getIcon('share-alt'),
        onPress: this.copyLink
      }
    ]

    const myToot = [
      {
        title: getTitle('删除'),
        icon: getIcon('trash-alt'),
        onPress: this.deleteStatuses
      },
      {
        title: getTitle(toot.pinned ? '取消置顶' : '置顶'),
        icon: getIcon('thumbtack'),
        onPress: this.setPin
      }
    ]

    const theirToot = [
      {
        title: getTitle('隐藏'),
        icon: getIcon('volume-mute'),
        onPress: this.muteAccount
      },
      {
        title: getTitle('屏蔽'),
        icon: getIcon('lock'),
        onPress: this.blockAccount
      }
    ]

    this.ref.measureInWindow((x, y, width, height) => {
      let items = baseItems.concat(this.isMine() ? myToot : theirToot)
      Menu.show({ x: x - 20, y, width, height }, items, {
        popoverStyle: {
          backgroundColor: color.themeColor,
          justifyContent: 'center',
          elevation: 10
        }
      })
    })
  }

  deleteStatuses = () => {
    const id = this.state.toot.id
    deleteStatuses(id).then(() => {
      this.props.deleteToot && this.props.deleteToot(id)
    })
  }

  setPin = () => {
    const toot = this.state.toot
    setPin(toot.id, toot.pinned).then(() => {
      this.setState(
        {
          toot: { ...toot, pinned: !toot.pinned }
        },
        () => {
          this.props.setPin && this.props.setPin(toot.id, toot.pinned)
        }
      )
    })
  }

  muteAccount = () => {
    const accountId = this.state.toot.account.id
    muteAccount(accountId, true).then(() => {
      this.props.muteAccount && this.props.muteAccount(accountId)
    })
  }

  blockAccount = () => {
    const accountId = this.state.toot.account.id
    blockAccount(accountId, true).then(() => {
      this.props.blockAccount && this.props.blockAccount(accountId)
    })
  }

  copyLink = () => {
    Clipboard.setString(this.state.toot.url)
  }

  /**
   * @description 是否是自己的嘟文
   */

  isMine = () => {
    const account = this.state.toot.account
    const mobxAccount = mobx.account
    return (
      mobxAccount.id === account.id && mobxAccount.username === account.username
    )
  }

  /**
   * 跳转入Toot详情页面
   * @param {toot} 嘟文内容
   */
  goTootDetail = toot => {
    if (!this.props) {
      return
    }
    mobx.updateReply({
      reply_to_username: toot.account.username,
      in_reply_to_account_id: toot.account.id,
      in_reply_to_id: toot.id,
      mentions: toot.mentions,
      spoiler_text: toot.spoiler_text,
      cw: false
    })
    this.props.navigation.navigate('TootDetail', {
      data: toot
    })
  }

  /**
   * @description 跳转入个人详情页面
   * @param {id}: id
   */
  goProfile = id => {
    if (!this.props) {
      return
    }
    this.props.navigation.navigate('Profile', {
      id: id
    })
  }

  replyTo = toot => {
    const navigation = this.props.navigation

    mobx.updateReply({
      reply_to_username: toot.account.username,
      in_reply_to_account_id: toot.account.id,
      in_reply_to_id: toot.id,
      mentions: toot.mentions,
      spoiler_text: toot.spoiler_text,
      cw: Boolean(toot.spoiler_text)
    })
    if (navigation.state.routeName !== 'TootDetail') {
      navigation.navigate('TootDetail', {
        data: toot
      })
    }
  }

  getTimeValue = time => {
    return new Date(
      momentTimezone(time)
        .tz(this.state.timezone)
        .format()
    ).valueOf()
  }

  /**
   * @description 返回相对时间或者关注好友的按钮
   * @param {data}: 嘟文数据，也可能是notification entity
   * @param {isNotificationPage}: 是否是通知页
   */
  getRelativeTimeOrIcon = (data, isNotificationPage) => {
    if (
      !data ||
      (isNotificationPage && this.state.notification.type === 'follow')
    ) {
      return null
    }

    return (
      <Text
        style={{
          flex: 1,
          textAlign: 'right'
        }}
      >
        <RelativeTime
          locale={this.state.locale}
          time={this.getTimeValue(data.created_at)}
        />
      </Text>
    )
  }

  /**
   * @description 返回HTML内容前先判断
   * @param {data}: 嘟文数据
   * @param {isNotificationPage}: 是否是通知页
   */
  getHTMLContent = (data, isNotificationPage) => {
    if (!data || data.type === 'follow') {
      return null
    }
    return (
      <View style={styles.htmlBox}>
        <TootContent
          data={data}
          sensitive={data.sensitive}
          isNotificationPage={isNotificationPage}
        />
      </View>
    )
  }

  /**
   * @description 返回嘟文底部图标
   * @param {data}: 嘟文数据
   * @param {isNotificationPage}: 是否是通知页
   */
  getIcons = (data, isNotificationPage) => {
    if (!data || data.type === 'follow') {
      return null
    }

    return (
      <View style={styles.iconBox}>
        <TouchableOpacity
          style={styles.iconParent}
          onPress={() => this.replyTo(data)}
        >
          <Icon style={styles.icon} name="reply" />
          <Text style={styles.bottomText}>{data.replies_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconParent}
          onPress={() => this.reblog(data.id, !data.reblogged)}
        >
          {data.reblogged ? (
            <Icon
              style={{ fontSize: 15, color: color.contrastColor }}
              name="retweet"
            />
          ) : (
            <Icon style={styles.icon} name="retweet" />
          )}
          <Text style={styles.bottomText}>{data.reblogs_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconParent}
          onPress={() => this.favourite(data.id, !data.favourited)}
        >
          {data.favourited ? (
            <Icon
              style={{ fontSize: 15, color: color.gold }}
              name="star"
              solid
            />
          ) : (
            <Icon style={styles.icon} name="star" />
          )}
          <Text style={styles.bottomText}>{data.favourites_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconParent}
          ref={ref => (this.ref = ref)}
          onPress={this.showMenu}
        >
          <Icon style={styles.icon} name="ellipsis-h" />
        </TouchableOpacity>
      </View>
    )
  }

  /**
   * @description 获取用户头像，如果是转发，则同时显示两人头像
   * @param {toot}: 包含所有信息的toot数据。如果数据为空，说明情况是：Notification Entity 中的follow类型
   */
  getAvatar = toot => {
    if (!toot) {
      toot = this.state.notification
    }
    if (!toot.reblog) {
      return (
        <Image style={styles.avatar} source={{ uri: toot.account.avatar }} />
      )
    }

    return (
      <View style={{ width: 40, height: 40, marginRight: 10 }}>
        <Image
          style={styles.avatarTopLeft}
          source={{ uri: toot.reblog.account.avatar }}
        />
        <Image
          style={styles.avatarBottomRight}
          source={{ uri: toot.account.avatar }}
        />
      </View>
    )
  }

  /**
   * @description 嘟文下方显示‘显示前文’
   * @param {data}: 嘟文数据
   */
  showTread = data => {
    if (!this.props.showTread) {
      // 如果是在toot详情页面，无须显示该字符
      return null
    }
    // 如果不是自己的嘟文
    if (mobx.account.id !== data.account.id) {
      return null
    }
    if (mobx.account.id !== data.in_reply_to_account_id) {
      return null
    }
    return (
      <TouchableOpacity
        style={styles.showTreadButton}
        onPress={() => this.goTootDetail(data)}
      >
        <Text style={[styles.showTreadText, { color: color.subColor }]}>
          显示前文
        </Text>
      </TouchableOpacity>
    )
  }

  /**
   * @description 嘟文上方的辅助性信息
   * @param {toot} 嘟文数据
   */
  getAdditionalInfo = toot => {
    const state = this.state
    let type = undefined
    let pTagStyle = { color: color.subColor }
    const info = {
      reblog: '转嘟了',
      pinned: '置顶嘟文',
      favourite: '收藏了',
      follow: '开始关注你',
      mention: '提及了'
    }
    const icon = {
      reblog: 'retweet',
      pinned: 'thumbtack',
      favourite: 'star',
      follow: 'user-plus'
    }
    const iconColor = {
      favourite: color.gold,
      follow: color.lightgreen,
      reblog: color.subColor
    }

    if (state.isNotificationPage) {
      // 如果是在通知页面，那么类型的名称可以直接当作变量名
      type = state.notification.type
      pTagStyle = {
        fontWeight: 'bold',
        color: color.contrastColor
      }
    } else if (toot) {
      // 如果嘟文内容存在，即普通嘟文模式
      if (toot.reblog) {
        type = 'reblog'
      } else if (toot.pinned) {
        type = 'pinned'
      }
    }

    if (type === undefined) {
      return type
    }

    /**
     * @description 返回嘟文上面的附加信息的用户名
     * 通知页面和其他页面所需要的用户名的数据来源不同
     */
    const getDisplayName = () => {
      let account = toot && toot.account
      if (state.isNotificationPage) {
        account = state.notification.account
      }

      return (
        <TouchableOpacity
          style={{
            width: '60%'
          }}
          activeOpacity={0.5}
          onPress={() =>
            this.props.navigation.navigate('Profile', {
              id: account.id
            })
          }
        >
          <HTMLView
            data={account.display_name || account.username}
            emojiObj={state.emojiObj}
            pTagStyle={pTagStyle}
          />
        </TouchableOpacity>
      )
    }

    return (
      <View style={styles.additional}>
        <Icon
          name={icon[type]}
          style={{ ...styles.additionalIcon, color: iconColor[type] }}
          solid
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            flex: 1
          }}
        >
          {getDisplayName()}
          <Text style={[{ color: color.contrastColor }, pTagStyle]}>
            {info[type]}
          </Text>
        </View>
      </View>
    )
  }

  getBody = toot => {
    const state = this.state
    const notification = state.notification
    const isNotificationPage = state.isNotificationPage
    let data = {} // 嘟文数据
    let pTagStyle = { color: color.contrastColor }

    if (isNotificationPage) {
      pTagStyle = {
        color: color.subColor
      }
    }

    if (isNotificationPage) {
      data = notification.status || notification
    } else if (toot) {
      data = toot.reblog || toot
    } else {
      return null
    }

    return (
      <View style={styles.body}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => this.goProfile(data.account.id)}
        >
          {this.getAvatar(toot)}
        </TouchableOpacity>
        <View style={styles.list}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => this.goTootDetail(data)}
          >
            <View style={styles.row}>
              <View
                style={
                  data.type === 'follow'
                    ? styles.notificationTitleWidth
                    : styles.titleWidth
                }
              >
                <HTMLView
                  data={data.account.display_name || data.account.username}
                  emojiObj={state.emojiObj}
                  pTagStyle={{
                    color: color.contrastColor,
                    fontWeight: 'bold',
                    fontSize: 14,
                    ...pTagStyle
                  }}
                />
                <Text
                  style={[
                    styles.smallGrey,
                    { color: color.contrastColor },
                    pTagStyle
                  ]}
                >
                  &nbsp;@{data.account.username}
                </Text>
              </View>
              {this.getRelativeTimeOrIcon(data, isNotificationPage)}
            </View>
            {this.getHTMLContent(data, isNotificationPage)}
            <MediaBox
              data={data && data.media_attachments}
              sensitive={data && data.sensitive}
            />
            {this.showTread(data)}
            {this.getIcons(data, isNotificationPage)}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  render() {
    const toot = this.state.toot
    color = themeData[mobx.theme]
    return (
      <View style={[styles.container, { backgroundColor: color.themeColor }]}>
        {this.getAdditionalInfo(toot)}
        {this.getBody(toot)}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
    marginTop: 15
  },
  additional: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: -5
  },
  additionalIcon: {
    width: 40,
    fontSize: 15,
    marginRight: 10,
    textAlign: 'right'
  },
  list: {
    alignItems: 'stretch',
    flex: 1
  },
  body: {
    flexDirection: 'row'
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 5,
    marginRight: 10
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  smallGrey: {
    fontWeight: 'normal'
  },
  titleWidth: {
    width: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start'
  },
  notificationTitleWidth: {
    width: 170,
    justifyContent: 'flex-start'
  },
  iconBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    width: '90%'
  },
  htmlBox: {
    flex: 1,
    marginTop: 10,
    marginRight: 20
  },
  icon: {
    fontSize: 15
  },
  menuIcon: {
    fontSize: 15,
    marginRight: 10
  },
  bottomText: {
    marginLeft: 10
  },
  iconParent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10
  },
  showTreadText: {
    fontSize: 15,
    textAlign: 'left'
  },
  showTreadButton: {
    marginTop: 5,
    width: 100
  },
  avatarTopLeft: {
    width: 30,
    height: 30,
    borderRadius: 3,
    position: 'absolute',
    top: 0,
    left: 0
  },
  avatarBottomRight: {
    width: 20,
    height: 20,
    borderRadius: 3,
    position: 'absolute',
    right: 0,
    bottom: 0
  },
  sensitiveSwitch: {
    width: 75,
    borderRadius: 3,
    padding: 5,
    paddingTop: 3,
    paddingBottom: 3,
    margin: 3,
    marginLeft: 0
  }
})

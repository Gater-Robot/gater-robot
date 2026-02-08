import { Card } from './ui'

export function UniswapEmbed(props: { url: string }) {
  return (
    <Card className="p-0 overflow-hidden">
      <iframe
        title="Uniswap Swap"
        src={props.url}
        height="660px"
        width="100%"
        style={{
          border: 0,
          display: 'block',
        }}
      />
    </Card>
  )
}

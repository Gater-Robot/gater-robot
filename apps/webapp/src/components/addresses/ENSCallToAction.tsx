import { ArrowUpRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function ENSCallToAction() {
  return (
    <Card className="border-dashed border-primary/30">
      <CardContent className="flex items-center gap-3 p-4">
        <img
          src="/ens-text-logo.svg"
          alt="ENS"
          className="h-6 w-auto opacity-80"
        />
        <div className="flex-1">
          <p className="text-sm font-medium">Get more with ENS</p>
          <p className="text-xs text-muted-foreground">
            Gater Communities are more powerful with an ENS name
          </p>
        </div>
        <a
          href="https://app.ens.domains"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm">
            Get ENS
            <ArrowUpRightIcon className="ml-1 size-4" />
          </Button>
        </a>
      </CardContent>
    </Card>
  )
}
